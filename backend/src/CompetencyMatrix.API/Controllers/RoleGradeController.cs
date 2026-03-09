using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Authorize]
public class RoleGradeController : ControllerBase
{
    private readonly IRoleGradeService _service;

    public RoleGradeController(IRoleGradeService service) => _service = service;

    [HttpGet("cargos")]
    public async Task<IActionResult> GetCargos() =>
        Ok(await _service.GetAllRolesAsync());

    [HttpGet("niveis")]
    public async Task<IActionResult> GetNiveis() =>
        Ok(await _service.GetAllGradesAsync());

    [HttpGet("skill-categories")]
    public async Task<IActionResult> GetCategories() =>
        Ok(await _service.GetAllCategoriesAsync());
}
