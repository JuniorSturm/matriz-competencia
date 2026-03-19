using System.Text.Json;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public enum EmailTemplateKey
{
    SignupVerification,
    WelcomeSetPassword,
    PasswordReset
}

public class EmailService
{
    private readonly IEmailSender       _sender;
    private readonly IEmailLogRepository _logs;

    public EmailService(IEmailSender sender, IEmailLogRepository logs)
    {
        _sender = sender;
        _logs   = logs;
    }

    public async Task SendAsync(
        EmailTemplateKey template,
        string           to,
        string           subject,
        object           templateModel)
    {
        var payloadJson = JsonSerializer.Serialize(templateModel);

        var log = new EmailLog
        {
            To          = to,
            Subject     = subject,
            TemplateKey = template.ToString(),
            Payload     = payloadJson,
            Status      = "PENDING",
            CreatedAt   = DateTime.UtcNow,
            SentAt      = DateTime.UtcNow
        };

        log.Id = await _logs.CreateAsync(log);

        try
        {
            var bodyHtml = EmailTemplates.Render(template, templateModel);
            await _sender.SendAsync(to, subject, bodyHtml);

            log.Status = "SUCCESS";
            log.Error  = null;
            log.SentAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            log.Status = "FAIL";
            log.Error  = ex.Message;
            log.SentAt = DateTime.UtcNow;
            throw;
        }
        finally
        {
            await _logs.UpdateAsync(log);
        }
    }
}

