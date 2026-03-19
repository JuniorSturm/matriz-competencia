using System.Text;
using System.Text.Json;

namespace CompetencyMatrix.Application.Services;

public static class EmailTemplates
{
    public static string Render(EmailTemplateKey key, object model)
    {
        return key switch
        {
            EmailTemplateKey.SignupVerification => RenderSignupVerification((dynamic)model),
            EmailTemplateKey.WelcomeSetPassword => RenderWelcomeSetPassword((dynamic)model),
            EmailTemplateKey.PasswordReset      => RenderPasswordReset((dynamic)model),
            _                                   => throw new ArgumentOutOfRangeException(nameof(key), key, null)
        };
    }

    private static string Layout(string title, string bodyHtml, string projectName, string logoUrl)
    {
        var sb = new StringBuilder();
        sb.Append("""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>
""");
        sb.Append(title);
        sb.Append("""
  </title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#f3f4f6; padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;background-color:#0f172a;color:#f9fafb;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:middle;">
""");
        if (!string.IsNullOrWhiteSpace(logoUrl))
        {
            sb.Append($"""<img src="{logoUrl}" alt="{projectName}" style="height:32px;vertical-align:middle;" />""");
        }
        else
        {
            sb.Append($"""<span style="font-weight:700;font-size:18px;">{projectName}</span>""");
        }

        sb.Append("""
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 24px 8px 24px;">
""");
        sb.Append(bodyHtml);
        sb.Append("""
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px 20px 24px;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
        <p style="margin:0 0 4px 0;">© 
""");
        sb.Append(DateTime.UtcNow.Year);
        sb.Append($" {projectName}. Todos os direitos reservados.");
        sb.Append("""
        </p>
        <p style="margin:0;">
          Esta mensagem é destinada exclusivamente ao destinatário. Ela pode conter informações sigilosas e confidenciais, protegidas pela legislação aplicável, incluindo a LGPD. 
          Se você não for o destinatário desta mensagem, fica notificado de que não deverá divulgá-la, copiá-la ou utilizá-la para qualquer finalidade. Apague permanentemente o e-mail e avise o remetente.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
""");
        return sb.ToString();
    }

    private static string RenderSignupVerification(dynamic model)
    {
        // Usamos leitura via JSON para evitar falhas de binding do `dynamic`
        // (ex.: quando o model chega como `object`, dicionário, etc).
        var root = JsonSerializer.SerializeToElement(model);
        var projectName = root.TryGetProperty("ProjectName", out JsonElement pn) ? (pn.GetString() ?? string.Empty) : string.Empty;
        var logoUrl = root.TryGetProperty("LogoUrl", out JsonElement lu) ? (lu.GetString() ?? string.Empty) : string.Empty;
        var code = root.TryGetProperty("Code", out JsonElement c) ? (c.GetString() ?? string.Empty) : string.Empty;

        var body = $"""
<h1 style="font-size:20px;margin:0 0 12px 0;color:#111827;">Confirme seu e-mail</h1>
<p style="margin:0 0 12px 0;color:#374151;">
  Use o código abaixo para concluir o seu cadastro e ativar o acesso à plataforma.
</p>
<p style="margin:0 0 16px 0;font-size:24px;font-weight:700;letter-spacing:0.35em;text-align:center;color:#111827;">
  {code}
</p>
<p style="margin:0;color:#6b7280;font-size:13px;">
  Este código é válido por tempo limitado. Se você não solicitou este cadastro, pode ignorar este e-mail.
</p>
""";

        return Layout("Confirme seu e-mail", body, projectName, logoUrl);
    }

    private static string RenderWelcomeSetPassword(dynamic model)
    {
        var root = JsonSerializer.SerializeToElement(model);
        var projectName = root.TryGetProperty("ProjectName", out JsonElement pn) ? (pn.GetString() ?? string.Empty) : string.Empty;
        var logoUrl     = root.TryGetProperty("LogoUrl", out JsonElement lu) ? (lu.GetString() ?? string.Empty) : string.Empty;
        var name        = root.TryGetProperty("Name", out JsonElement n) ? (n.GetString() ?? string.Empty) : string.Empty;
        var link        = root.TryGetProperty("Link", out JsonElement l) ? (l.GetString() ?? string.Empty) : string.Empty;
        var companyName = root.TryGetProperty("CompanyName", out JsonElement cn) ? (cn.GetString() ?? string.Empty) : string.Empty;

        var body = $"""
<h1 style="font-size:20px;margin:0 0 12px 0;color:#111827;">Bem-vindo(a) ao {projectName}</h1>
<p style="margin:0 0 12px 0;color:#374151;">
  Olá {name}, você foi cadastrado(a) na empresa {companyName} na plataforma de Matriz de Competências.
</p>
<p style="margin:0 0 16px 0;color:#374151;">
  Para começar a usar o sistema, defina a sua senha de acesso clicando no botão abaixo:
</p>
<p style="margin:0 0 16px 0;text-align:center;">
  <a href="{link}" style="display:inline-block;padding:10px 18px;border-radius:999px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">
    Definir minha senha
  </a>
</p>
<p style="margin:0;color:#6b7280;font-size:13px;">
  Se o botão não funcionar, copie e cole o link abaixo no navegador:<br />
  <span style="word-break:break-all;">{link}</span>
</p>
""";

        return Layout("Defina sua senha de acesso", body, projectName, logoUrl);
    }

    public static string RenderWelcomeSetPassword(string projectName, string logoUrl, string name, string companyName, string link)
        => RenderWelcomeSetPassword(new { ProjectName = projectName, LogoUrl = logoUrl, Name = name, CompanyName = companyName, Link = link });

    private static string RenderPasswordReset(dynamic model)
    {
        var root = JsonSerializer.SerializeToElement(model);
        var projectName = root.TryGetProperty("ProjectName", out JsonElement pn) ? (pn.GetString() ?? string.Empty) : string.Empty;
        var logoUrl     = root.TryGetProperty("LogoUrl", out JsonElement lu) ? (lu.GetString() ?? string.Empty) : string.Empty;
        var link        = root.TryGetProperty("Link", out JsonElement l) ? (l.GetString() ?? string.Empty) : string.Empty;

        var body = $"""
<h1 style="font-size:20px;margin:0 0 12px 0;color:#111827;">Redefinição de senha</h1>
<p style="margin:0 0 12px 0;color:#374151;">
  Recebemos uma solicitação para redefinir a senha da sua conta.
</p>
<p style="margin:0 0 16px 0;color:#374151;">
  Se você fez essa solicitação, clique no botão abaixo para escolher uma nova senha:
</p>
<p style="margin:0 0 16px 0;text-align:center;">
  <a href="{link}" style="display:inline-block;padding:10px 18px;border-radius:999px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">
    Redefinir senha
  </a>
</p>
<p style="margin:0 0 8px 0;color:#6b7280;font-size:13px;">
  Se você não solicitou a redefinição, pode ignorar este e-mail. Sua senha atual continuará válida.
</p>
<p style="margin:0;color:#6b7280;font-size:13px;">
  Se o botão não funcionar, copie e cole o link abaixo no navegador:<br />
  <span style="word-break:break-all;">{link}</span>
</p>
""";

        return Layout("Redefinição de senha", body, projectName, logoUrl);
    }
}

