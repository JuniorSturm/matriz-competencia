using System.Security.Cryptography;
using System.Text;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using BC = BCrypt.Net.BCrypt;

namespace CompetencyMatrix.Application.Services;

public class InviteService
{
    private readonly IInviteRepository   _invites;
    private readonly IUserRepository     _users;
    private readonly ICompanyRepository  _companies;
    private readonly IAuditService       _audit;
    private readonly EmailService        _emailService;

    public InviteService(
        IInviteRepository   invites,
        IUserRepository     users,
        ICompanyRepository  companies,
        IAuditService       audit,
        EmailService        emailService)
    {
        _invites     = invites;
        _users       = users;
        _companies   = companies;
        _audit       = audit;
        _emailService = emailService;
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string HashToken(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash  = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public async Task SendInviteAsync(InviteRequest request, Guid invitedByUserId, string frontendBaseUrl, string? ip, string? userAgent)
    {
        var company = await _companies.GetByIdAsync(request.CompanyId)
                      ?? throw new InvalidOperationException("Empresa não encontrada.");

        var existingUser = await _users.GetByEmailAsync(request.Email);
        if (existingUser is not null && existingUser.CompanyId == request.CompanyId)
            throw new InvalidOperationException("Já existe um usuário com esse e-mail na empresa.");

        var existingInvite = await _invites.GetActiveByEmailAsync(request.Email, request.CompanyId);
        var token = GenerateToken();
        var tokenHash = HashToken(token);
        var expiresAt = DateTime.UtcNow.AddDays(7);

        Invite invite;
        var isResend = false;

        if (existingInvite is null)
        {
            invite = new Invite
            {
                Email           = request.Email,
                CompanyId       = request.CompanyId,
                InvitedByUserId = invitedByUserId,
                TokenHash       = tokenHash,
                ExpiresAt       = expiresAt,
                CreatedAt       = DateTime.UtcNow,
                UsedAt          = null
            };
            invite.Id = await _invites.CreateAsync(invite);
        }
        else
        {
            existingInvite.TokenHash = tokenHash;
            existingInvite.ExpiresAt = expiresAt;
            existingInvite.UsedAt    = null;
            await _invites.UpdateAsync(existingInvite);
            invite = existingInvite;
            isResend = true;
        }

        var link = $"{frontendBaseUrl.TrimEnd('/')}/invite/accept?token={Uri.EscapeDataString(token)}";
        await _emailService.SendAsync(
            EmailTemplateKey.WelcomeSetPassword,
            request.Email,
            $"Convite para acessar {company.Name}",
            new
            {
                ProjectName = company.Name,
                LogoUrl     = _companies is null ? string.Empty : string.Empty,
                Name        = request.Email,
                Link        = link,
                CompanyName = company.Name
            });

        await _audit.LogAsync(
            entityType: "Invite",
            entityId:   invite.Id.ToString(),
            operation:  isResend ? "InviteResent" : "InvitedUser",
            before:     null,
            after:      new { request.Email, request.CompanyId, invitedByUserId, expiresAt, ip, userAgent },
            companyId:  request.CompanyId,
            teamId:     null);
    }

    public async Task<Invite?> ValidateInviteAsync(string token)
    {
        var hash = HashToken(token);
        var invite = await _invites.GetByTokenHashAsync(hash);
        return invite is not null && invite.UsedAt is null && invite.ExpiresAt > DateTime.UtcNow
            ? invite
            : null;
    }

    public async Task<Guid> AcceptInviteAsync(InviteAcceptRequest request, string? ip, string? userAgent)
    {
        var hash = HashToken(request.Token);
        var invite = await _invites.GetByTokenHashAsync(hash);
        if (invite is null)
        {
            await _audit.LogAsync(
                entityType: "Invite",
                entityId:   "unknown",
                operation:  "InviteInvalid",
                before:     null,
                after:      new { request.Token, ip, userAgent },
                companyId:  null,
                teamId:     null);
            throw new InvalidOperationException("Convite inválido ou expirado.");
        }

        if (invite.UsedAt is not null || invite.ExpiresAt <= DateTime.UtcNow)
        {
            await _audit.LogAsync(
                entityType: "Invite",
                entityId:   invite.Id.ToString(),
                operation:  "InviteExpired",
                before:     null,
                after:      new { invite.Email, invite.CompanyId, ip, userAgent },
                companyId:  invite.CompanyId,
                teamId:     null);
            throw new InvalidOperationException("Convite inválido ou expirado.");
        }

        var existing = await _users.GetByEmailAsync(invite.Email);
        if (existing is not null && existing.CompanyId == invite.CompanyId)
            throw new InvalidOperationException("Já existe um usuário com esse e-mail na empresa.");

        var user = new User
        {
            Name         = request.Name,
            Email        = invite.Email,
            Password     = BC.HashPassword(request.Password),
            CompanyId    = invite.CompanyId,
            IsManager    = false,
            IsAdmin      = false,
            IsCoordinator = false,
            CreatedAt    = DateTime.UtcNow
        };

        var userId = await _users.CreateAsync(user);

        invite.UsedAt = DateTime.UtcNow;
        await _invites.UpdateAsync(invite);

        await _audit.LogAsync(
            entityType: "Invite",
            entityId:   invite.Id.ToString(),
            operation:  "InviteAccepted",
            before:     null,
            after:      new { invite.Email, invite.CompanyId, userId, ip, userAgent },
            companyId:  invite.CompanyId,
            teamId:     null);

        return userId;
    }
}

