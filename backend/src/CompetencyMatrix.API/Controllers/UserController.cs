using System.Security.Claims;
using CompetencyMatrix.Application;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _service;

    public UserController(IUserService service) => _service = service;

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _service.GetAllAsync(GetCurrentUserId(User)));

    [HttpGet("paged")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PaginationDefaults.DefaultPageSize,
        [FromQuery] string? name = null,
        [FromQuery] bool onlyCollaborators = true)
    {
        if (page <= 0 || pageSize <= 0)
            return BadRequest(new { message = "Parâmetros de paginação inválidos." });

        pageSize = Math.Min(pageSize, PaginationDefaults.MaxPageSize);

        var result = await _service.GetPagedAsync(GetCurrentUserId(User), page, pageSize, name, onlyCollaborators);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _service.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var id = await _service.CreateAsync(request, GetCurrentUserId(User));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        await _service.UpdateAsync(id, request, GetCurrentUserId(User));
        return NoContent();
    }

    [HttpPut("{id:guid}/password")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
    {
        await _service.ResetPasswordAsync(id, request.Password);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
