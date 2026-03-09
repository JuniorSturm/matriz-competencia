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

    public AssessmentController(IAssessmentService service) => _service = service;

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetByUser(Guid userId)
        => Ok(await _service.GetByUserAsync(userId));

    [HttpPost]
    [Authorize(Roles = "MANAGER")]
    public async Task<IActionResult> Upsert([FromBody] UpsertAssessmentRequest request)
    {
        await _service.UpsertAsync(request);
        return Ok();
    }
}
