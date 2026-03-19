namespace CompetencyMatrix.Application.DTOs;

public class SignupRequest
{
    // Dados da empresa
    public string Name     { get; set; } = string.Empty;
    public string Document { get; set; } = string.Empty;
    public string Email    { get; set; } = string.Empty;
    public string? Phone   { get; set; }

    // Dados do primeiro usuário (gestor da empresa)
    public string UserName  { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Password  { get; set; } = string.Empty;
}

public class SignupResult
{
    public int  CompanyId { get; set; }
    public Guid UserId    { get; set; }
    public string Email   { get; set; } = string.Empty;
    public bool RequiresVerification { get; set; }

    // Opcionalmente podemos devolver o mesmo formato do LoginResponse
    public LoginResponse? Login { get; set; }
}

public class SignupVerifyRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code  { get; set; } = string.Empty;
}

public class SignupResendCodeRequest
{
    public string Email { get; set; } = string.Empty;
}

