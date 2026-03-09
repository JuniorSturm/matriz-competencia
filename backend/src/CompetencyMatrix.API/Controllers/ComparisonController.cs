using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("comparisons")]
[Authorize(Roles = "MANAGER")]
public class ComparisonController : ControllerBase
{
    private readonly IAssessmentService _service;

    public ComparisonController(IAssessmentService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Compare([FromQuery] Guid userA, [FromQuery] Guid userB, [FromQuery] Guid? userC = null)
        => Ok(await _service.CompareAsync(userA, userB, userC));
}
