using System.Security.Cryptography;
using System.Text;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Application.Services;
using CompetencyMatrix.Domain.Entities;
using System.Transactions;
using BC = BCrypt.Net.BCrypt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly ISignupService _signup;
    private readonly ISignupVerificationRepository _verifications;
    private readonly IUserRepository _users;
    private readonly IPasswordResetTokenRepository _passwordTokens;
    private readonly EmailService _emailService;
    private readonly IAuditService _audit;
    private readonly IConfiguration _configuration;

    public AuthController(
        IAuthService auth,
        ISignupService signup,
        ISignupVerificationRepository verifications,
        IUserRepository users,
        IPasswordResetTokenRepository passwordTokens,
        EmailService emailService,
        IAuditService audit,
        IConfiguration configuration)
    {
        _auth   = auth;
        _signup = signup;
        _verifications = verifications;
        _users = users;
        _passwordTokens = passwordTokens;
        _emailService = emailService;
        _audit = audit;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _users.GetByEmailAsync(request.Email);
        if (user is not null && BCrypt.Net.BCrypt.Verify(request.Password, user.Password) && !user.IsEmailVerified)
            return Conflict(new { message = "E-mail ainda não verificado. Verifique sua caixa de entrada." });

        var result = await _auth.LoginAsync(request);
        if (result is null)
            return Unauthorized(new { message = "Credenciais inválidas." });

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { message = "Dados inválidos.", errors = ModelState });

        string? ip = null;
        string? userAgent = null;

        var httpContext = HttpContext;
        if (httpContext is not null)
        {
            var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            ip = !string.IsNullOrWhiteSpace(forwarded)
                ? forwarded.Split(',')[0].Trim()
                : httpContext.Connection.RemoteIpAddress?.ToString();

            userAgent = httpContext.Request.Headers["User-Agent"].FirstOrDefault();
        }

        try
        {
            var result = await _signup.SignupAsync(request, ip, userAgent);
            if (result.Login is not null)
                return Ok(result.Login);

            // Retornamos o objeto completo para o frontend saber que exige verificação
            // e ter o e-mail para completar o fluxo na tela /signup/verify.
            return Created(string.Empty, result);
        }
        catch (InvalidOperationException ex)
        {
            // Conflitos de negócio conhecidos (e.g. e-mail já em uso) tratamos como 409.
            if (ex.Message.Contains("E-mail já está em uso.", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = ex.Message });

            // Demais falhas (como erro ao enviar e-mail) retornam 500 com mensagem clara.
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("signup/verify")]
    public async Task<IActionResult> VerifySignup([FromBody] SignupVerifyRequest request)
    {
        var existing = await _verifications.GetActiveByEmailAsync(request.Email);
        if (existing is null)
            return BadRequest(new { message = "Código inválido ou expirado." });

        if (!BCrypt.Net.BCrypt.Verify(request.Code, existing.CodeHash))
            return BadRequest(new { message = "Código inválido ou expirado." });

        existing.VerifiedAt = DateTime.UtcNow;
        await _verifications.UpdateAsync(existing);

        var user = await _users.GetByIdAsync(existing.UserId);
        if (user is not null)
        {
            user.IsEmailVerified = true;
            user.EmailVerifiedAt = DateTime.UtcNow;
            await _users.UpdateAsync(user);
        }

        var login = await _auth.LoginVerifiedAsync(existing.UserId);
        if (login is null)
            return Ok(new { verified = true, email = request.Email });

        return Ok(new { verified = true, email = request.Email, login });
    }

    [AllowAnonymous]
    [HttpPost("signup/resend-code")]
    public async Task<IActionResult> ResendSignupCode([FromBody] SignupResendCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "E-mail é obrigatório." });

        var user = await _users.GetByEmailAsync(request.Email);

        // Para evitar enumeração de usuários, em caso de não encontrado já respondemos como "enviado".
        if (user is null || user.IsEmailVerified || !user.CompanyId.HasValue)
            return Ok(new { resent = true });

        string? ip = null;
        string? userAgent = null;
        var httpContext = HttpContext;
        if (httpContext is not null)
        {
            var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            ip = !string.IsNullOrWhiteSpace(forwarded)
                ? forwarded.Split(',')[0].Trim()
                : httpContext.Connection.RemoteIpAddress?.ToString();

            userAgent = httpContext.Request.Headers["User-Agent"].FirstOrDefault();
        }

        var expiresAt = DateTime.UtcNow.AddMinutes(20);
        var code = RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");
        var codeHash = BCrypt.Net.BCrypt.HashPassword(code);

        using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            var existing = await _verifications.GetActiveByEmailAsync(request.Email);
            if (existing is null)
            {
                existing = new SignupVerification
                {
                    UserId = user.Id,
                    CompanyId = user.CompanyId.Value,
                    Email = user.Email,
                    CodeHash = codeHash,
                    ExpiresAt = expiresAt,
                    Attempts = 0,
                    VerifiedAt = null,
                    CreatedAt = DateTime.UtcNow
                };
                existing.Id = await _verifications.CreateAsync(existing);
            }
            else
            {
                existing.CodeHash = codeHash;
                existing.ExpiresAt = expiresAt;
                existing.Attempts = 0;
                existing.VerifiedAt = null;
                await _verifications.UpdateAsync(existing);
            }

            scope.Complete();
        }

        try
        {
            await _emailService.SendAsync(
                EmailTemplateKey.SignupVerification,
                user.Email,
                "Confirme seu e-mail de acesso",
                new
                {
                    ProjectName = "Skillhub",
                    LogoUrl = string.Empty,
                    Code = code
                });

            await _audit.LogAsync(
                entityType: "Signup",
                entityId: request.Email,
                operation: "SignupVerifSent",
                before: null,
                after: new
                {
                    expiresAt,
                    ip,
                    userAgent,
                    Origem = "AUTOCADASTRO"
                },
                companyId: user.CompanyId,
                teamId: null);

            return Ok(new { resent = true });
        }
        catch (Exception ex)
        {
            await _audit.LogAsync(
                entityType: "Signup",
                entityId: request.Email,
                operation: "SignupVerifFail",
                before: null,
                after: new
                {
                    expiresAt,
                    ip,
                    userAgent,
                    Origem = "AUTOCADASTRO",
                    error = ex.Message
                },
                companyId: user.CompanyId,
                teamId: null);

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Não foi possível reenviar o código de verificação. Tente novamente mais tarde."
            });
        }
    }

    [AllowAnonymous]
    [HttpPost("password/forgot")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _users.GetByEmailAsync(request.Email);
        if (user is null)
            return Ok(new { sent = true });

        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var token = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = Sha256Hash(rawToken),
            Type = "RESET",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow
        };
        token.Id = await _passwordTokens.CreateAsync(token);

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"]
                              ?? _configuration["Cors:AllowedOrigins"]?.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault()
                              ?? "http://localhost:3000";

        await _emailService.SendAsync(
            EmailTemplateKey.PasswordReset,
            user.Email,
            "Redefinição de senha",
            new
            {
                ProjectName = "Skillhub",
                LogoUrl = string.Empty,
                Link = $"{frontendBaseUrl.TrimEnd('/')}/password/reset?token={Uri.EscapeDataString(rawToken)}"
            });

        return Ok(new { sent = true });
    }

    [AllowAnonymous]
    [HttpGet("password/reset")]
    public async Task<IActionResult> ValidateReset([FromQuery] string token)
    {
        var item = await _passwordTokens.GetByHashAsync(Sha256Hash(token));
        if (item is null || item.UsedAt.HasValue || item.ExpiresAt <= DateTime.UtcNow)
            return BadRequest(new { message = "Token inválido ou expirado." });

        return Ok(new { valid = true });
    }

    [AllowAnonymous]
    [HttpPost("password/reset")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordWithTokenRequest request)
    {
        var item = await _passwordTokens.GetByHashAsync(Sha256Hash(request.Token));
        if (item is null || item.UsedAt.HasValue || item.ExpiresAt <= DateTime.UtcNow)
            return BadRequest(new { message = "Token inválido ou expirado." });

        await _users.UpdatePasswordAsync(item.UserId, BC.HashPassword(request.NewPassword));

        // Se o token é do tipo SET (fluxo de boas-vindas/primeiro acesso),
        // ao definir a senha consideramos o e-mail automaticamente verificado.
        if (string.Equals(item.Type, "SET", StringComparison.OrdinalIgnoreCase))
        {
            var user = await _users.GetByIdAsync(item.UserId);
            if (user is not null && !user.IsEmailVerified)
            {
                user.IsEmailVerified = true;
                user.EmailVerifiedAt = DateTime.UtcNow;
                await _users.UpdateAsync(user);
            }
        }

        item.UsedAt = DateTime.UtcNow;
        await _passwordTokens.UpdateAsync(item);
        return Ok(new { reset = true });
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _auth.RefreshAsync(request);
        if (result is null)
            return Unauthorized(new { message = "Refresh token inválido ou expirado." });

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        await _auth.RevokeRefreshAsync(request.RefreshToken);
        return Ok();
    }

    private static string Sha256Hash(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public class ResetPasswordWithTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
