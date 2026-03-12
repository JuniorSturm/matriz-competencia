using System.Security.Claims;
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
    private readonly IUserService  _userService;

    public SkillController(ISkillService service, IUserService userService)
    {
        _service     = service;
        _userService = userService;
    }

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? roleId, [FromQuery] int? companyId)
    {
        if (roleId.HasValue)
            return Ok(await _service.GetByRoleAsync(roleId.Value));

        var currentUserId = GetCurrentUserId(User);
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (role == "ADMIN")
        {
            if (companyId.HasValue)
                return Ok(await _service.GetAllByCompanyAsync(companyId.Value));
            return Ok(await _service.GetAllAsync());
        }

        if (currentUserId.HasValue)
        {
            var currentUser = await _userService.GetByIdAsync(currentUserId.Value);
            if (currentUser?.CompanyId != null)
                return Ok(await _service.GetAllByCompanyAsync(currentUser.CompanyId.Value));
        }

        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("paged")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> GetPaged([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] int? companyId = null)
    {
        if (page <= 0 || pageSize <= 0)
            return BadRequest(new { message = "Parâmetros de paginação inválidos." });

        var currentUserId = GetCurrentUserId(User);
        var role          = User.FindFirstValue(ClaimTypes.Role);

        int? finalCompanyId = companyId;

        // Admin pode informar qualquer empresa ou não filtrar.
        if (role != "ADMIN" && currentUserId.HasValue)
        {
            var currentUser = await _userService.GetByIdAsync(currentUserId.Value);
            if (currentUser?.CompanyId != null)
                finalCompanyId = currentUser.CompanyId.Value;
        }

        var result = await _service.GetPagedAsync(page, pageSize, finalCompanyId);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var skill = await _service.GetByIdAsync(id);
        return skill is null ? NotFound() : Ok(skill);
    }

    [HttpPost]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        var currentUserId = GetCurrentUserId(User);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var finalRequest = request;
        if (role != "ADMIN" && currentUserId.HasValue)
        {
            var currentUser = await _userService.GetByIdAsync(currentUserId.Value);
            if (currentUser?.CompanyId != null)
                finalRequest = request with { CompanyId = currentUser.CompanyId.Value };
        }

        if (!finalRequest.CompanyId.HasValue || finalRequest.CompanyId == 0)
            return BadRequest(new { message = "Empresa é obrigatória." });

        var id = await _service.CreateAsync(finalRequest);
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSkillRequest request)
    {
        await _service.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Competência não encontrada." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("expectations")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
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
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
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
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> UpsertDescription([FromBody] UpsertDescriptionRequest request)
    {
        try
        {
            await _service.UpsertDescriptionAsync(request);
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
