using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash);
    Task<long>          CreateAsync(RefreshToken token);
    Task                RevokeAsync(long id);
    Task                RevokeByTokenHashAsync(string tokenHash);
    Task                DeleteExpiredAsync(DateTime before);
}
