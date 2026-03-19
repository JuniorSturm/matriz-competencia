using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IPasswordResetTokenRepository
{
    Task<long> CreateAsync(PasswordResetToken token);
    Task<PasswordResetToken?> GetByHashAsync(string tokenHash);
    Task UpdateAsync(PasswordResetToken token);
}

