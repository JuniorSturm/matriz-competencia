using System.Security.Claims;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("assessments")]
[Authorize]
public class AssessmentController : ControllerBase
{
    private readonly IAssessmentService _service;
    private readonly IUserService       _userService;

    public AssessmentController(IAssessmentService service, IUserService userService)
    {
        _service     = service;
        _userService = userService;
    }

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet("{userId:guid}")]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> GetByUser(Guid userId)
    {
        var currentUserId = GetCurrentUserId(User);
        if (currentUserId is null) return Unauthorized();
        if (!await _userService.CanSeeUserAsync(currentUserId.Value, userId))
            return Forbid();
        return Ok(await _service.GetByUserAsync(userId));
    }

    [HttpPost]
    [Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
    public async Task<IActionResult> Upsert([FromBody] UpsertAssessmentRequest request)
    {
        var currentUserId = GetCurrentUserId(User);
        if (currentUserId is null) return Unauthorized();
        if (!await _userService.CanSeeUserAsync(currentUserId.Value, request.UserId))
            return Forbid();
        await _service.UpsertAsync(request);
        return Ok();
    }
}
