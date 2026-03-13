using System.Security.Claims;
using CompetencyMatrix.Application;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("roles")]
[Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
public class RoleController : ControllerBase
{
    private readonly IRoleService _service;

    public RoleController(IRoleService service) => _service = service;

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? companyId)
    {
        var list = await _service.GetAllAsync(GetCurrentUserId(User), companyId);
        return Ok(list);
    }

    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PaginationDefaults.DefaultPageSize,
        [FromQuery] int? companyId = null)
    {
        if (page <= 0 || pageSize <= 0)
            return BadRequest(new { message = "Parâmetros de paginação inválidos." });

        pageSize = Math.Min(pageSize, PaginationDefaults.MaxPageSize);

        var result = await _service.GetPagedAsync(GetCurrentUserId(User), companyId, page, pageSize);
        return Ok(result);
    }

    [HttpGet("by-company/{companyId:int}")]
    public async Task<IActionResult> GetByCompany(int companyId)
    {
        var list = await _service.GetByCompanyAsync(companyId, GetCurrentUserId(User));
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await _service.GetByIdAsync(id);
        return role is null ? NotFound() : Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        try
        {
            var id = await _service.CreateAsync(request, GetCurrentUserId(User));
            return CreatedAtAction(nameof(GetById), new { id }, new { id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoleRequest request)
    {
        try
        {
            await _service.UpdateAsync(id, request, GetCurrentUserId(User));
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteAsync(id, GetCurrentUserId(User));
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Cargo não encontrado." });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
