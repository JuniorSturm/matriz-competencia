using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IInviteRepository
{
    Task<Invite?> GetByTokenHashAsync(string tokenHash);
    Task<Invite?> GetActiveByEmailAsync(string email, int companyId);
    Task<int>     CreateAsync(Invite invite);
    Task          UpdateAsync(Invite invite);
}

