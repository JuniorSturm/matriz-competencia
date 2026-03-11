using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CompetencyMatrix.Infrastructure.Security;

public class JwtService : IJwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int    _expiryMinutes;

    public JwtService(IConfiguration config)
    {
        _secret        = config["Jwt:Secret"]   ?? throw new InvalidOperationException("Jwt:Secret not configured");
        _issuer        = config["Jwt:Issuer"]   ?? "CompetencyMatrix";
        _audience      = config["Jwt:Audience"] ?? "CompetencyMatrix";
        _expiryMinutes = int.TryParse(config["Jwt:ExpiryMinutes"], out var exp) ? exp : 480;
    }

    public string GenerateToken(Guid userId, string email, bool isManager, bool isAdmin, bool isCoordinator)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var role = isAdmin ? "ADMIN" : isManager ? "MANAGER" : isCoordinator ? "COORDINATOR" : "EMPLOYEE";

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(_expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
