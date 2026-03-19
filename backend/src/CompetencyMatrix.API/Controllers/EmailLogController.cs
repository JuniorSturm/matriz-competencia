using System.Collections;
using System.Dynamic;
using System.Text.Json;
using CompetencyMatrix.Application.Services;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("emails")]
[Authorize(Roles = "ADMIN")]
public class EmailLogController : ControllerBase
{
    private readonly IEmailLogRepository _repo;
    private readonly EmailService _emailService;
    private readonly IConfiguration _configuration;

    public EmailLogController(IEmailLogRepository repo, EmailService emailService, IConfiguration configuration)
    {
        _repo = repo;
        _emailService = emailService;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null, [FromQuery] string? templateKey = null, [FromQuery] string? to = null)
    {
        var (items, totalCount) = await _repo.GetPagedAsync(page, pageSize, status, templateKey, to);
        return Ok(new { items, totalCount });
    }

    [HttpPost("{id:long}/resend")]
    public async Task<IActionResult> Resend(long id)
    {
        var log = await _repo.GetByIdAsync(id);
        if (log is null)
            return NotFound();

        var template = Enum.Parse<EmailTemplateKey>(log.TemplateKey);
        var payload = JsonSerializer.Deserialize<ExpandoObject>(log.Payload ?? "{}") ?? new ExpandoObject();

        // Ajusta links antigos que vinham do front dev (5173) para a URL pública atual (frontend BaseUrl)
        // - WelcomeSetPassword:  /password/set  -> /password/reset
        // - PasswordReset:       /password/reset (apenas base/porta)
        var frontendBaseUrl = _configuration["Frontend:BaseUrl"]?.TrimEnd('/')
                               ?? "http://localhost:3000";

        var payloadDict = (IDictionary<string, object?>)payload;
        if (payloadDict.TryGetValue("Link", out var linkObj) && linkObj is string linkStr)
        {
            // Troca host/porta
            linkStr = linkStr
                .Replace("http://localhost:5173", frontendBaseUrl)
                .Replace("http://localhost:5175", frontendBaseUrl);

            // WelcomeSetPassword usava /password/set (rota não existente). Agora deve usar /password/reset.
            // Ex.: http://.../password/set?token=...  => http://.../password/reset?token=...
            linkStr = linkStr.Replace("/password/set?token=", "/password/reset?token=");

            payloadDict["Link"] = linkStr;
        }

        await _emailService.SendAsync(template, log.To, log.Subject, payload);
        return Ok(new { resent = true });
    }
}

