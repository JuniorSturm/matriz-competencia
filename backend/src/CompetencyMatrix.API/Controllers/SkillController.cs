using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("skills")]
[Authorize]
public class SkillController : ControllerBase
{
    private readonly ISkillService _service;

    public SkillController(ISkillService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? roleId)
    {
        if (roleId.HasValue)
            return Ok(await _service.GetByRoleAsync(roleId.Value));
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var skill = await _service.GetByIdAsync(id);
        return skill is null ? NotFound() : Ok(skill);
    }

    [HttpPost]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        var id = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSkillRequest request)
    {
        await _service.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("expectations")]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> UpsertExpectation([FromBody] UpsertExpectationRequest request)
    {
        await _service.UpsertExpectationAsync(request);
        return Ok();
    }

    [HttpGet("{skillId:int}/expectations")]
    public async Task<IActionResult> GetExpectations(int skillId)
    {
        var expectations = await _service.GetExpectationsBySkillAsync(skillId);
        return Ok(expectations);
    }

    [HttpDelete("{skillId:int}/expectations")]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> DeleteExpectation(int skillId, [FromQuery] int roleId, [FromQuery] int gradeId)
    {
        await _service.DeleteExpectationAsync(skillId, roleId, gradeId);
        return NoContent();
    }

    [HttpGet("{skillId:int}/descriptions")]
    public async Task<IActionResult> GetDescriptions(int skillId)
    {
        var descriptions = await _service.GetDescriptionsAsync(skillId);
        return Ok(descriptions);
    }

    [HttpPost("descriptions")]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> UpsertDescription([FromBody] UpsertDescriptionRequest request)
    {
        await _service.UpsertDescriptionAsync(request);
        return Ok();
    }
}
