using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("dashboard")]
[Authorize(Roles = "ADMIN")]
public class DashboardController : ControllerBase
{
    private readonly IUserRepository  _users;
    private readonly ISkillRepository _skills;

    public DashboardController(IUserRepository users, ISkillRepository skills)
    {
        _users  = users;
        _skills = skills;
    }

    [HttpGet("admin-stats")]
    public async Task<ActionResult<AdminDashboardStats>> GetAdminStats()
    {
        var totalUsers    = await _users.CountAllAsync();
        var totalManagers = await _users.CountManagersAsync();
        var (_, totalSkills) = await _skills.GetPagedAsync(page: 1, pageSize: 1, companyId: null);

        return Ok(new AdminDashboardStats(totalUsers, totalSkills, totalManagers));
    }
}

