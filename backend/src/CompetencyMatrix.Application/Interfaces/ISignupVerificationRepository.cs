using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface ISignupVerificationRepository
{
    Task<long> CreateAsync(SignupVerification verification);
    Task<SignupVerification?> GetActiveByEmailAsync(string email);
    Task<SignupVerification?> GetByEmailAndHashAsync(string email, string codeHash);
    Task UpdateAsync(SignupVerification verification);
}

