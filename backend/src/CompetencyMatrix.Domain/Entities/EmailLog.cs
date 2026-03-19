namespace CompetencyMatrix.Domain.Entities;

public class EmailLog
{
    public long      Id          { get; set; }
    public string    To          { get; set; } = string.Empty;
    public string    Subject     { get; set; } = string.Empty;
    public string    TemplateKey { get; set; } = string.Empty;
    public string?   Payload     { get; set; }
    public DateTime  SentAt      { get; set; }
    public string    Status      { get; set; } = string.Empty;
    public string?   Error       { get; set; }
    public DateTime  CreatedAt   { get; set; }
}

