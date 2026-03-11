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

public record CompanyUserResponse(
    Guid    Id,
    string  Name,
    string  Email,
    bool    IsManager
);

public record AddUserToCompanyRequest(
    Guid UserId
);
