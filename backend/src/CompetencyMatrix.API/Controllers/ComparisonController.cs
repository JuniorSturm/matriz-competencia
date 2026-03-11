using System.Security.Claims;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("comparisons")]
[Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
public class ComparisonController : ControllerBase
{
    private readonly IAssessmentService _service;
    private readonly IUserService       _userService;

    public ComparisonController(IAssessmentService service, IUserService userService)
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
    public async Task<IActionResult> Compare([FromQuery] Guid userA, [FromQuery] Guid userB, [FromQuery] Guid? userC = null)
    {
        var currentUserId = GetCurrentUserId(User);
        if (currentUserId is null) return Unauthorized();
        if (!await _userService.CanSeeUserAsync(currentUserId.Value, userA)) return Forbid();
        if (!await _userService.CanSeeUserAsync(currentUserId.Value, userB)) return Forbid();
        if (userC.HasValue && !await _userService.CanSeeUserAsync(currentUserId.Value, userC.Value)) return Forbid();
        return Ok(await _service.CompareAsync(userA, userB, userC));
    }
}
