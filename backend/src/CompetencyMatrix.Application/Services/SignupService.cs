using System.Security.Cryptography;
using System.Transactions;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using BC = BCrypt.Net.BCrypt;

namespace CompetencyMatrix.Application.Services;

public class SignupService : ISignupService
{
    private readonly IUserRepository    _users;
    private readonly ICompanyRepository _companies;
    private readonly IAuditService      _audit;
    private readonly IAuthService       _auth;
    private readonly ISignupVerificationRepository _verifications;
    private readonly EmailService _emailService;

    public SignupService(
        IUserRepository    users,
        ICompanyRepository companies,
        IAuditService      audit,
        IAuthService       auth,
        ISignupVerificationRepository verifications,
        EmailService emailService)
    {
        _users     = users;
        _companies = companies;
        _audit     = audit;
        _auth      = auth;
        _verifications = verifications;
        _emailService = emailService;
    }

    public async Task<SignupResult> SignupAsync(SignupRequest request, string? ip, string? userAgent)
    {
        // Validação mínima
        if (string.IsNullOrWhiteSpace(request.UserEmail))
            throw new InvalidOperationException("E-mail do usuário é obrigatório.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Nome da empresa é obrigatório.");

        if (string.IsNullOrWhiteSpace(request.Document))
            throw new InvalidOperationException("CNPJ da empresa é obrigatório.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new InvalidOperationException("E-mail da empresa é obrigatório.");

        if (string.IsNullOrWhiteSpace(request.Phone))
            throw new InvalidOperationException("Telefone da empresa é obrigatório.");

        var existing = await _users.GetByEmailAsync(request.UserEmail);
        if (existing is not null)
        {
            await _audit.LogAsync(
                entityType: "Signup",
                entityId:   request.UserEmail,
                operation:  "ConflitoEmail",
                before:     null,
                after:      new
                {
                    request.UserEmail,
                    request.Name,
                    request.Document,
                    Origem = "AUTOCADASTRO"
                },
                companyId:  null,
                teamId:     null);

            throw new InvalidOperationException("E-mail já está em uso.");
        }

        int companyId;
        Guid userId;
        DateTime verificationExpiresAt;

        // Código precisa ser o MESMO que será enviado ao usuário e que será validado no banco.
        var code = RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");

        using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            var company = new Company
            {
                Name     = request.Name,
                Document = request.Document,
                Email    = request.Email,
                Phone    = request.Phone
            };

            companyId = await _companies.CreateAsync(company);

            var user = new User
            {
                Id             = Guid.NewGuid(),
                Name           = request.UserName,
                Email          = request.UserEmail,
                Password       = BC.HashPassword(request.Password),
                CompanyId      = companyId,
                IsManager      = true,
                IsAdmin        = false,
                IsCoordinator  = false,
                IsEmailVerified = false,
                CreatedAt      = DateTime.UtcNow
            };

            userId = await _users.CreateAsync(user);

            await _companies.AddUserToCompanyAsync(companyId, userId);

            var verification = new SignupVerification
            {
                UserId    = userId,
                CompanyId = companyId,
                Email     = request.UserEmail,
                CodeHash  = BCrypt.Net.BCrypt.HashPassword(code),
                ExpiresAt = DateTime.UtcNow.AddMinutes(20),
                Attempts  = 0,
                CreatedAt = DateTime.UtcNow
            };
            verification.Id = await _verifications.CreateAsync(verification);
            verificationExpiresAt = verification.ExpiresAt;

            // Auditoria de criação
            await _audit.LogAsync(
                entityType: "Company",
                entityId:   companyId.ToString(),
                operation:  "EmpresaAuto",
                before:     null,
                after:      new
                {
                    request.Name,
                    request.Document,
                    request.Email,
                    ip,
                    userAgent,
                    Origem = "AUTOCADASTRO"
                },
                companyId:  companyId,
                teamId:     null);

            await _audit.LogAsync(
                entityType: "User",
                entityId:   userId.ToString(),
                operation:  "UsuarioAuto",
                before:     null,
                after:      new
                {
                    request.UserName,
                    request.UserEmail,
                    companyId,
                    ip,
                    userAgent,
                    Origem = "AUTOCADASTRO"
                },
                companyId:  companyId,
                teamId:     null);

            scope.Complete();
        }

        try
        {
            await _emailService.SendAsync(
                EmailTemplateKey.SignupVerification,
                request.UserEmail,
                "Confirme seu e-mail de acesso",
                new
                {
                    ProjectName = "Skillhub",
                    LogoUrl = string.Empty,
                    Code = code
                });

            await _audit.LogAsync(
                entityType: "Signup",
                entityId: request.UserEmail,
                operation: "SignupVerifSent",
                before: null,
                after: new
                {
                    expiresAt = verificationExpiresAt,
                    ip,
                    userAgent,
                    Origem = "AUTOCADASTRO"
                },
                companyId: companyId,
                teamId: null);
        }
        catch (Exception ex)
        {
            await _audit.LogAsync(
                entityType: "Signup",
                entityId: request.UserEmail,
                operation: "SignupVerifFail",
                before: null,
                after: new
                {
                    expiresAt = verificationExpiresAt,
                    ip,
                    userAgent,
                    Origem = "AUTOCADASTRO",
                    error = ex.Message
                },
                companyId: companyId,
                teamId: null);

            // Mantém email_logs do envio (já persistido via EmailService) e reverte o "signup" criado.
            try
            {
                await _users.DeleteAsync(userId);
                await _companies.DeleteAsync(companyId);
            }
            catch
            {
                // Se a limpeza falhar, o sistema ainda deve retornar o erro original do envio.
            }

            throw new InvalidOperationException("Não foi possível enviar o e-mail de verificação. Tente novamente mais tarde.", ex);
        }

        return new SignupResult
        {
            CompanyId = companyId,
            UserId    = userId,
            Email     = request.UserEmail,
            RequiresVerification = true,
            Login     = null
        };
    }
}

