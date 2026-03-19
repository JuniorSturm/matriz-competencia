using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IUserRepository  _users;
    private readonly ISkillRepository _skills;
    private readonly IDashboardRepository _dashboard;

    public DashboardController(IUserRepository users, ISkillRepository skills, IDashboardRepository dashboard)
    {
        _users  = users;
        _skills = skills;
        _dashboard = dashboard;
    }

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet("admin-stats")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<AdminDashboardStats>> GetAdminStats()
    {
        var totalUsers    = await _users.CountAllAsync();
        var totalManagers = await _users.CountManagersAsync();
        var (_, totalSkills) = await _skills.GetPagedAsync(page: 1, pageSize: 1, companyId: null);

        return Ok(new AdminDashboardStats(totalUsers, totalSkills, totalManagers));
    }

    [HttpGet("admin-health")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<AdminHealthStats>> GetAdminHealth()
    {
        var stats = await _dashboard.GetAdminHealthAsync();
        return Ok(stats);
    }

    [HttpGet("manager-company")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<ActionResult<ManagerCompanyDashboard>> GetManagerCompany([FromQuery] int? companyId = null)
    {
        var currentUserId = GetCurrentUserId(User);
        if (currentUserId is null) return Unauthorized();

        var me = await _users.GetByIdAsync(currentUserId.Value);
        if (me is null) return Unauthorized();

        var effectiveCompanyId =
            me.IsAdmin
                ? (companyId ?? me.CompanyId)
                : me.CompanyId;

        if (!effectiveCompanyId.HasValue)
            return BadRequest(new { message = "Usuário sem empresa vinculada." });

        var dashboard = await _dashboard.GetManagerCompanyDashboardAsync(effectiveCompanyId.Value);
        return Ok(dashboard);
    }

    [HttpGet("coordinator-teams")]
    [Authorize(Roles = "COORDINATOR,ADMIN")]
    public async Task<ActionResult<CoordinatorTeamsDashboard>> GetCoordinatorTeams()
    {
        var currentUserId = GetCurrentUserId(User);
        if (currentUserId is null) return Unauthorized();

        var dashboard = await _dashboard.GetCoordinatorTeamsDashboardAsync(currentUserId.Value);
        return Ok(dashboard);
    }
}

