using System.Security.Claims;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("teams")]
[Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
public class TeamController : ControllerBase
{
    private readonly ITeamService _service;

    public TeamController(ITeamService service) => _service = service;

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _service.GetAllAsync(GetCurrentUserId(User)));

    [HttpGet("company/{companyId:int}")]
    public async Task<IActionResult> GetByCompany(int companyId) =>
        Ok(await _service.GetAllByCompanyAsync(companyId));

    [HttpGet("assigned-member-ids")]
    public async Task<IActionResult> GetAssignedMemberIds([FromQuery] int? excludeTeamId = null) =>
        Ok(await _service.GetAssignedMemberIdsAsync(excludeTeamId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var team = await _service.GetByIdAsync(id);
        return team is null ? NotFound() : Ok(team);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamRequest request)
    {
        try
        {
            var id = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id }, new { id });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTeamRequest request)
    {
        try
        {
            await _service.UpdateAsync(id, request);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Time não encontrado." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
