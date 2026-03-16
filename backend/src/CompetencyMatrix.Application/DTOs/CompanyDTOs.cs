namespace CompetencyMatrix.Application.DTOs;

public record CreateCompanyRequest(
    string  Name,
    string? Document,
    string? Email,
    string? Phone,
    List<Guid>? UserIds
);

public record UpdateCompanyRequest(
    string  Name,
    string? Document,
    string? Email,
    string? Phone,
    bool    IsActive,
    List<Guid>? UserIds
);

public record CompanyResponse(
    int      Id,
    string   Name,
    string?  Document,
    string?  Email,
    string?  Phone,
    bool     IsActive,
    DateTime CreatedAt,
    List<CompanyUserResponse> Users
);

/// <summary>Mínimo para dropdown/filtro (evita GetAll completo).</summary>
public record CompanyOptionResponse(int Id, string Name, bool IsActive);

public record CompanyListItemResponse(
    int      Id,
    string   Name,
    string?  Document,
    string?  Email,
    string?  Phone,
    bool     IsActive,
    DateTime CreatedAt,
    int      CollaboratorCount,
    int     ManagerCount
);

public record CompanyUserResponse(
    Guid    Id,
    string  Name,
    string  Email,
    bool    IsManager
);

public record AddUserToCompanyRequest(
    Guid UserId
);
