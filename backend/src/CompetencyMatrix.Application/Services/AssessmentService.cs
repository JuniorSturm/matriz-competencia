using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class AssessmentService : IAssessmentService
{
    private readonly IAssessmentRepository _assessments;
    private readonly ISkillRepository      _skills;
    private readonly IUserRepository       _users;

    private static readonly Dictionary<string, int> LevelOrder = new()
    {
        { "DESCONHECE", 0 },
        { "BRONZE",     1 },
        { "PRATA",      2 },
        { "OURO",       3 }
    };

    public AssessmentService(
        IAssessmentRepository assessments,
        ISkillRepository      skills,
        IUserRepository       users)
    {
        _assessments = assessments;
        _skills      = skills;
        _users       = users;
    }

    public async Task<IEnumerable<AssessmentResponse>> GetByUserAsync(Guid userId)
    {
        var user = await _users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"Usuário {userId} não encontrado.");

        if (user.RoleId is null || user.GradeId is null)
            return Enumerable.Empty<AssessmentResponse>();

        var expectations = (await _skills.GetExpectationsAsync(user.RoleId.Value, user.GradeId.Value))
                                         .ToDictionary(e => e.SkillId);
        var assessments  = (await _assessments.GetByUserAsync(userId))
                                              .ToDictionary(a => a.SkillId);

        var skills = await _skills.GetByRoleAsync(user.RoleId.Value);
        var roleNames = await _skills.GetSkillRoleNamesAsync(skills.Select(s => s.Id), user.RoleId.Value);

        return skills.Select(skill =>
        {
            var expectedLevel = expectations.TryGetValue(skill.Id, out var exp)
                ? exp.ExpectedLevel : "DESCONHECE";
            var currentLevel  = assessments.TryGetValue(skill.Id, out var ass)
                ? ass.CurrentLevel : "DESCONHECE";
            var gap = LevelOrder[expectedLevel] - LevelOrder[currentLevel];
            var roleName = roleNames.TryGetValue(skill.Id, out var rn) ? rn : null;

            return new AssessmentResponse(skill.Id, skill.Name, expectedLevel, currentLevel, gap, roleName);
        });
    }

    public async Task UpsertAsync(UpsertAssessmentRequest request)
    {
        var assessment = new SkillAssessment
        {
            UserId       = request.UserId,
            SkillId      = request.SkillId,
            CurrentLevel = request.CurrentLevel,
            LastUpdated  = DateTime.UtcNow
        };
        await _assessments.UpsertAsync(assessment);
    }

    public async Task<IEnumerable<ComparisonRow>> CompareAsync(Guid userAId, Guid userBId, Guid? userCId = null)
    {
        var userA = await _users.GetByIdAsync(userAId)
            ?? throw new KeyNotFoundException($"Usuário A {userAId} não encontrado.");
        var userB = await _users.GetByIdAsync(userBId)
            ?? throw new KeyNotFoundException($"Usuário B {userBId} não encontrado.");

        var skillsA = (await _skills.GetByRoleAsync(userA.RoleId ?? 0)).ToList();
        var skillsB = (await _skills.GetByRoleAsync(userB.RoleId ?? 0)).ToList();

        // Only keep skills common to all compared users' roles
        var commonIds = new HashSet<int>(skillsA.Select(s => s.Id));
        commonIds.IntersectWith(skillsB.Select(s => s.Id));

        User? userC = null;
        if (userCId.HasValue)
        {
            userC = await _users.GetByIdAsync(userCId.Value)
                ?? throw new KeyNotFoundException($"Usuário C {userCId.Value} não encontrado.");
            var skillsC = await _skills.GetByRoleAsync(userC.RoleId ?? 0);
            commonIds.IntersectWith(skillsC.Select(s => s.Id));
        }

        var commonSkills = skillsA.Where(s => commonIds.Contains(s.Id)).ToList();

        var expectationsA = userA.RoleId.HasValue && userA.GradeId.HasValue
            ? (await _skills.GetExpectationsAsync(userA.RoleId.Value, userA.GradeId.Value))
              .ToDictionary(e => e.SkillId)
            : new Dictionary<int, SkillExpectation>();

        var assessmentsA = (await _assessments.GetByUserAsync(userAId)).ToDictionary(a => a.SkillId);
        var assessmentsB = (await _assessments.GetByUserAsync(userBId)).ToDictionary(a => a.SkillId);

        Dictionary<int, SkillAssessment>? assessmentsC = null;
        if (userCId.HasValue)
            assessmentsC = (await _assessments.GetByUserAsync(userCId.Value)).ToDictionary(a => a.SkillId);

        return commonSkills.Select(skill =>
        {
            var expected = expectationsA.TryGetValue(skill.Id, out var exp) ? exp.ExpectedLevel : "DESCONHECE";
            var levelA   = assessmentsA.TryGetValue(skill.Id, out var assA) ? assA.CurrentLevel : "DESCONHECE";
            var levelB   = assessmentsB.TryGetValue(skill.Id, out var assB) ? assB.CurrentLevel : "DESCONHECE";

            string? levelC = null;
            int?    gapC   = null;
            if (assessmentsC is not null)
            {
                levelC = assessmentsC.TryGetValue(skill.Id, out var assC) ? assC.CurrentLevel : "DESCONHECE";
                gapC   = LevelOrder[expected] - LevelOrder[levelC];
            }

            return new ComparisonRow(
                skill.Id,
                skill.Name,
                expected,
                levelA,
                levelB,
                LevelOrder[expected] - LevelOrder[levelA],
                LevelOrder[expected] - LevelOrder[levelB],
                levelC,
                gapC
            );
        });
    }
}
