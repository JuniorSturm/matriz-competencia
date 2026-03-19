using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

using CompetencyMatrix.Application.Services;

namespace CompetencyMatrix.Infrastructure.Services;

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public SmtpEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var host     = _configuration["Email:Host"];
        var portStr  = _configuration["Email:Port"];
        var user     = _configuration["Email:User"];
        var password = _configuration["Email:Password"];
        var from     = _configuration["Email:From"];
        var enableSsl = bool.TryParse(_configuration["Email:Ssl"], out var ssl) && ssl;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("Configurações de e-mail ausentes (Email:Host/Email:From).");

        var port = 25;
        if (!string.IsNullOrWhiteSpace(portStr) && int.TryParse(portStr, out var parsed))
            port = parsed;

        using var message = new MailMessage
        {
            From       = new MailAddress(from),
            Subject    = subject,
            Body       = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(new MailAddress(to));

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl
        };

        if (!string.IsNullOrWhiteSpace(user))
        {
            client.Credentials = new NetworkCredential(user, password);
        }

        await client.SendMailAsync(message);
    }
}

