using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class AssessmentService : IAssessmentService
{
    private readonly IAssessmentRepository _assessments;
    private readonly IUserRepository       _users;
    private readonly ITeamRepository       _teams;

    private static readonly Dictionary<string, int> LevelOrder = new()
    {
        { "DESCONHECE", 0 },
        { "BRONZE",     1 },
        { "PRATA",      2 },
        { "OURO",       3 }
    };

    public AssessmentService(
        IAssessmentRepository assessments,
        IUserRepository       users,
        ITeamRepository       teams)
    {
        _assessments = assessments;
        _users       = users;
        _teams       = teams;
    }

    public async Task<IEnumerable<AssessmentResponse>> GetByUserAsync(Guid userId)
    {
        var user = await _users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"Usuário {userId} não encontrado.");

        if (user.RoleId is null || user.GradeId is null)
            return Enumerable.Empty<AssessmentResponse>();

        var teamSkillIds = (await _teams.GetSkillIdsForUserTeamsAsync(userId)).ToList();
        IEnumerable<AssessmentMatrixRow> rows;

        if (teamSkillIds.Count > 0)
            rows = await _assessments.GetUserTeamMatrixAsync(userId, user.RoleId.Value, user.GradeId.Value, teamSkillIds);
        else
            rows = await _assessments.GetUserMatrixAsync(userId, user.RoleId.Value, user.GradeId.Value);

        return rows.Select(r =>
        {
            var gap = LevelOrder.GetValueOrDefault(r.ExpectedLevel) - LevelOrder.GetValueOrDefault(r.CurrentLevel);
            return new AssessmentResponse(r.SkillId, r.SkillName, r.ExpectedLevel, r.CurrentLevel, gap, r.RoleName);
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
        var userATask = _users.GetByIdAsync(userAId);
        var userBTask = _users.GetByIdAsync(userBId);
        var userCTask = userCId.HasValue ? _users.GetByIdAsync(userCId.Value) : Task.FromResult<User?>(null);

        await Task.WhenAll(userATask, userBTask, userCTask);

        var userA = userATask.Result ?? throw new KeyNotFoundException($"Usuário A {userAId} não encontrado.");
        var userB = userBTask.Result ?? throw new KeyNotFoundException($"Usuário B {userBId} não encontrado.");
        var userC = userCId.HasValue && userCTask.Result is null
            ? throw new KeyNotFoundException($"Usuário C {userCId.Value} não encontrado.")
            : userCTask.Result;

        var teamSkillIdsA = (await _teams.GetSkillIdsForUserTeamsAsync(userAId)).ToHashSet();
        var teamSkillIdsB = (await _teams.GetSkillIdsForUserTeamsAsync(userBId)).ToHashSet();

        if (teamSkillIdsA.Count == 0 || teamSkillIdsB.Count == 0)
            return Enumerable.Empty<ComparisonRow>();

        var matrixATask = (userA.RoleId.HasValue && userA.GradeId.HasValue)
            ? _assessments.GetUserTeamMatrixAsync(userAId, userA.RoleId.Value, userA.GradeId.Value, teamSkillIdsA)
            : Task.FromResult(Enumerable.Empty<AssessmentMatrixRow>());
        var matrixBTask = (userB.RoleId.HasValue && userB.GradeId.HasValue)
            ? _assessments.GetUserTeamMatrixAsync(userBId, userB.RoleId.Value, userB.GradeId.Value, teamSkillIdsB)
            : Task.FromResult(Enumerable.Empty<AssessmentMatrixRow>());

        Task<IEnumerable<AssessmentMatrixRow>>? matrixCTask = null;
        if (userC is not null && userC.RoleId.HasValue && userC.GradeId.HasValue)
        {
            var teamSkillIdsC = (await _teams.GetSkillIdsForUserTeamsAsync(userCId!.Value)).ToHashSet();
            if (teamSkillIdsC.Count > 0)
                matrixCTask = _assessments.GetUserTeamMatrixAsync(userCId!.Value, userC.RoleId.Value, userC.GradeId.Value, teamSkillIdsC);
        }

        var tasks = new List<Task> { matrixATask, matrixBTask };
        if (matrixCTask is not null) tasks.Add(matrixCTask);
        await Task.WhenAll(tasks);

        var mapA = matrixATask.Result.ToDictionary(r => r.SkillId);
        var mapB = matrixBTask.Result.ToDictionary(r => r.SkillId);
        var mapC = matrixCTask?.Result.ToDictionary(r => r.SkillId);

        var commonIds = new HashSet<int>(mapA.Keys);
        commonIds.IntersectWith(mapB.Keys);
        if (mapC is not null) commonIds.IntersectWith(mapC.Keys);

        return commonIds.Select(skillId =>
        {
            var a = mapA[skillId];
            var b = mapB[skillId];
            var expected = a.ExpectedLevel;
            var expOrd   = LevelOrder.GetValueOrDefault(expected);

            string? levelC = null;
            int?    gapC   = null;
            if (mapC is not null && mapC.TryGetValue(skillId, out var c))
            {
                levelC = c.CurrentLevel;
                gapC   = expOrd - LevelOrder.GetValueOrDefault(levelC);
            }

            return new ComparisonRow(
                skillId,
                a.SkillName,
                expected,
                a.CurrentLevel,
                b.CurrentLevel,
                expOrd - LevelOrder.GetValueOrDefault(a.CurrentLevel),
                expOrd - LevelOrder.GetValueOrDefault(b.CurrentLevel),
                levelC,
                gapC
            );
        });
    }
}
