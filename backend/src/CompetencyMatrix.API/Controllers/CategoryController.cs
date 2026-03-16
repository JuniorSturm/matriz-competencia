using System.Security.Claims;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("categories")]
[Authorize]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _service;
    private readonly IUserService      _userService;

    public CategoryController(ICategoryService service, IUserService userService)
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
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> GetByCompany([FromQuery] int? companyId)
    {
        var currentUserId = GetCurrentUserId(User);
        var role = User.FindFirstValue(ClaimTypes.Role);

        int? finalCompanyId = companyId;
        if (role != "ADMIN" && currentUserId.HasValue)
        {
            var currentUser = await _userService.GetByIdAsync(currentUserId.Value);
            if (currentUser?.CompanyId != null)
                finalCompanyId = currentUser.CompanyId.Value;
        }

        if (!finalCompanyId.HasValue || finalCompanyId.Value == 0)
            return BadRequest(new { message = "Informe a empresa (companyId) ou use um perfil com empresa definida." });

        var list = await _service.GetByCompanyIdAsync(finalCompanyId.Value);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> GetById(int id)
    {
        var category = await _service.GetByIdAsync(id);
        return category is null ? NotFound() : Ok(category);
    }

    [HttpPost]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId(User);
            var id = await _service.CreateAsync(request, currentUserId);
            return CreatedAtAction(nameof(GetById), new { id }, new { id });
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

    [HttpPut("{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId(User);
            await _service.UpdateAsync(id, request, currentUserId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Categoria não encontrada." });
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

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId(User);
            await _service.DeleteAsync(id, currentUserId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Categoria não encontrada." });
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
