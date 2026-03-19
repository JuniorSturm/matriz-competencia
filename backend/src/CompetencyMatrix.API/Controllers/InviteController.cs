using System.Security.Claims;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("invites")]
public class InviteController : ControllerBase
{
    private readonly InviteService _service;
    private readonly IConfiguration _configuration;

    public InviteController(InviteService service, IConfiguration configuration)
    {
        _service       = service;
        _configuration = configuration;
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new InvalidOperationException("Usuário não autenticado.");
    }

    private (string? ip, string? userAgent) GetRequestContext()
    {
        var httpContext = HttpContext;
        if (httpContext is null) return (null, null);

        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        var ip = !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : httpContext.Connection.RemoteIpAddress?.ToString();

        var userAgent = httpContext.Request.Headers["User-Agent"].FirstOrDefault();
        return (ip, userAgent);
    }

    [HttpPost]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> SendInvite([FromBody] InviteRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var (ip, userAgent) = GetRequestContext();

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"]
                              ?? _configuration["Cors:AllowedOrigins"]?.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault()
                              ?? "http://localhost:5173";

        try
        {
            await _service.SendInviteAsync(request, currentUserId, frontendBaseUrl, ip, userAgent);
            return Created(string.Empty, new { message = "Convite enviado." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpGet("accept")]
    public async Task<IActionResult> Validate([FromQuery] string token)
    {
        var invite = await _service.ValidateInviteAsync(token);
        if (invite is null)
            return BadRequest(new { message = "Convite inválido ou expirado." });

        return Ok(new
        {
            invite.Email,
            invite.CompanyId,
        });
    }

    [AllowAnonymous]
    [HttpPost("accept")]
    public async Task<IActionResult> Accept([FromBody] InviteAcceptRequest request)
    {
        var (ip, userAgent) = GetRequestContext();

        try
        {
            var userId = await _service.AcceptInviteAsync(request, ip, userAgent);
            return Ok(new { userId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

