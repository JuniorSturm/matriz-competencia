using ClosedXML.Excel;
using System.Text;

var excelPath = @"c:\JuniorSturm\matriz-competencia\Base\Matriz Plataforma - Starship MC_v4.xlsx";
var outputPath = @"c:\JuniorSturm\matriz-competencia\database\migrations\002_seed_data.sql";

var sb = new StringBuilder();
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- Matriz de Competências - Seed de Dados");
sb.AppendLine("-- Script único para carga inicial de todos os dados");
sb.AppendLine($"-- Gerado automaticamente em: {DateTime.Now:yyyy-MM-dd HH:mm}");
sb.AppendLine("-- REGRA: skills são ÚNICOS (sem duplicação por cargo).");
sb.AppendLine("--        Vínculo com cargos via skill_expectations.");
sb.AppendLine("--        Cat. 'Geral' = visível a todos os cargos.");
sb.AppendLine("-- ============================================================");
sb.AppendLine();
sb.AppendLine("SET client_encoding = 'UTF8';");
sb.AppendLine();

// ── TRUNCATE ALL TABLES ──────────────────────────────────────────────────────
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- TRUNCATE ALL TABLES");
sb.AppendLine("-- ============================================================");
sb.AppendLine("TRUNCATE TABLE skill_assessments, skill_descriptions, skill_expectations, skills, users, grades, roles, skill_categories RESTART IDENTITY CASCADE;");
sb.AppendLine();

// ── CATEGORIES ───────────────────────────────────────────────────────────────
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- CATEGORIAS DE COMPETÊNCIAS");
sb.AppendLine("-- ============================================================");
sb.AppendLine("INSERT INTO skill_categories (name) VALUES");
sb.AppendLine("    ('Desenvolvimento'),");
sb.AppendLine("    ('Devops'),");
sb.AppendLine("    ('Geral'),");
sb.AppendLine("    ('Negócio'),");
sb.AppendLine("    ('Testes')");
sb.AppendLine("ON CONFLICT (name) DO NOTHING;");
sb.AppendLine();

// ── ROLES ────────────────────────────────────────────────────────────────────
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- ROLES (áreas de atuação)");
sb.AppendLine("-- ============================================================");
sb.AppendLine("INSERT INTO roles (name) VALUES ('Desenvolvedor Backend')  ON CONFLICT (name) DO NOTHING;");
sb.AppendLine("INSERT INTO roles (name) VALUES ('Desenvolvedor Frontend') ON CONFLICT (name) DO NOTHING;");
sb.AppendLine("INSERT INTO roles (name) VALUES ('Qualidade')               ON CONFLICT (name) DO NOTHING;");
sb.AppendLine("INSERT INTO roles (name) VALUES ('DevOps')                  ON CONFLICT (name) DO NOTHING;");
sb.AppendLine();

// ── GRADES ───────────────────────────────────────────────────────────────────
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- GRADES (senioridade)");
sb.AppendLine("-- ============================================================");
sb.AppendLine("INSERT INTO grades (name, ordinal) VALUES ('TRAINEE', 0) ON CONFLICT (name) DO NOTHING;");
sb.AppendLine("INSERT INTO grades (name, ordinal) VALUES ('JUNIOR',  1) ON CONFLICT (name) DO NOTHING;");
sb.AppendLine("INSERT INTO grades (name, ordinal) VALUES ('PLENO',   2) ON CONFLICT (name) DO NOTHING;");
sb.AppendLine("INSERT INTO grades (name, ordinal) VALUES ('SENIOR',  3) ON CONFLICT (name) DO NOTHING;");
sb.AppendLine();

// ── ADMIN USER ───────────────────────────────────────────────────────────────
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- USUÁRIO GESTOR PADRÃO (senha: Admin@123)");
sb.AppendLine("-- ============================================================");
sb.AppendLine("INSERT INTO users (id, name, email, password, role_id, grade_id, is_manager)");
sb.AppendLine("SELECT");
sb.AppendLine("    gen_random_uuid(),");
sb.AppendLine("    'Administrador',");
sb.AppendLine("    'admin@empresa.com',");
sb.AppendLine("    '$2a$11$hJlpe4Kww9XQN2JQUg4EkOvRMRbnXy77zPPSI8Mum359TrO.eX22q',");
sb.AppendLine("    NULL,");
sb.AppendLine("    NULL,");
sb.AppendLine("    TRUE");
sb.AppendLine("WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@empresa.com');");
sb.AppendLine();

using var wb = new XLWorkbook(excelPath);

string Esc(string s) => s.Replace("'", "''").Trim();

string MapLevel(string abbr)
{
    return abbr.Trim().ToUpper() switch
    {
        "D" => "DESCONHECE",
        "B" => "BRONZE",
        "P" => "PRATA",
        "O" => "OURO",
        _ => ""
    };
}

// Mapeia categorias do Excel para categoria do sistema
// Remove "Comportamentais", renomeia "Dev" → "Desenvolvimento"
string MapCategory(string raw)
{
    var c = raw.Trim();
    if (c.Equals("Dev", StringComparison.OrdinalIgnoreCase)) return "Desenvolvimento";
    if (c.Equals("Comportamentais", StringComparison.OrdinalIgnoreCase)) return ""; // excluir
    if (c.Equals("Devops", StringComparison.OrdinalIgnoreCase)) return "Devops";
    if (c.Equals("Testes", StringComparison.OrdinalIgnoreCase)) return "Testes";
    if (c.Equals("Negócio", StringComparison.OrdinalIgnoreCase) || c.Equals("Negocio", StringComparison.OrdinalIgnoreCase)) return "Negócio";
    if (c.Equals("Geral", StringComparison.OrdinalIgnoreCase)) return "Geral";
    return c;
}

// ── DATA STRUCTURES ──────────────────────────────────────────────────────────
// Skill name → SkillData (unique per skill name)
var skillMap = new Dictionary<string, SkillData>(StringComparer.OrdinalIgnoreCase);
var userInfoList = new List<UserInfo>();
var userAssessments = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);

// ─── 1. READ Matriz_Comportamentos ──────────────────────────────────────────
// SKIP - Comportamentais category does not exist and should be excluded
Console.WriteLine("Skipping Matriz_Comportamentos (Comportamentais category excluded).");

// ─── 2. READ Matriz_Plataforma ──────────────────────────────────────────────
if (wb.TryGetWorksheet("Matriz_Plataforma", out var wsPlatforma))
{
    Console.WriteLine("Reading Matriz_Plataforma...");

    var roleGradeCols = new (string role, string grade, int cCol, int pCol)[]
    {
        ("Desenvolvedor Backend", "TRAINEE", 5, 6),
        ("Desenvolvedor Backend", "JUNIOR", 7, 8),
        ("Desenvolvedor Backend", "PLENO", 9, 10),
        ("Desenvolvedor Backend", "SENIOR", 11, 12),
        ("Desenvolvedor Frontend", "TRAINEE", 14, 15),
        ("Desenvolvedor Frontend", "JUNIOR", 16, 17),
        ("Desenvolvedor Frontend", "PLENO", 18, 19),
        ("Desenvolvedor Frontend", "SENIOR", 20, 21),
        ("Qualidade", "TRAINEE", 23, 24),
        ("Qualidade", "JUNIOR", 25, 26),
        ("Qualidade", "PLENO", 27, 28),
        ("Qualidade", "SENIOR", 29, 30),
        ("DevOps", "TRAINEE", 32, 33),
        ("DevOps", "JUNIOR", 34, 35),
        ("DevOps", "PLENO", 36, 37),
        ("DevOps", "SENIOR", 38, 39),
    };

    // Read user info from header rows (col 46+, every 2 cols)
    for (int col = 46; col <= 120; col += 2)
    {
        var userName = wsPlatforma.Cell(2, col).GetString().Trim();
        if (string.IsNullOrWhiteSpace(userName)) break;
        var enquadramento = wsPlatforma.Cell(3, col).GetString().Trim();

        string role = "Desenvolvedor Backend";
        string grade = "JUNIOR";

        if (enquadramento.Contains("Backend", StringComparison.OrdinalIgnoreCase))
            role = "Desenvolvedor Backend";
        else if (enquadramento.Contains("Frontend", StringComparison.OrdinalIgnoreCase))
            role = "Desenvolvedor Frontend";
        else if (enquadramento.Contains("Q.A.", StringComparison.OrdinalIgnoreCase) || enquadramento.Contains("QA", StringComparison.OrdinalIgnoreCase))
            role = "Qualidade";
        else if (enquadramento.Contains("Devops", StringComparison.OrdinalIgnoreCase))
            role = "DevOps";

        if (enquadramento.Contains("Trainee", StringComparison.OrdinalIgnoreCase))
            grade = "TRAINEE";
        else if (enquadramento.Contains("Júnior", StringComparison.OrdinalIgnoreCase) || enquadramento.Contains("Junior", StringComparison.OrdinalIgnoreCase))
            grade = "JUNIOR";
        else if (enquadramento.Contains("Pleno", StringComparison.OrdinalIgnoreCase))
            grade = "PLENO";
        else if (enquadramento.Contains("Sênior", StringComparison.OrdinalIgnoreCase) || enquadramento.Contains("Senior", StringComparison.OrdinalIgnoreCase))
            grade = "SENIOR";

        var email = GenerateEmail(userName);
        userInfoList.Add(new UserInfo(userName, email, role, grade, col, col + 1));
        userAssessments[email] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        Console.WriteLine($"  User: {userName} -> {role}/{grade} ({email})");
    }

    // Read skills, expectations & assessments
    int lastRow = wsPlatforma.LastRowUsed()?.RowNumber() ?? 0;
    for (int row = 5; row <= lastRow; row++)
    {
        var metaStr = wsPlatforma.Cell(row, 2).GetString().Trim();
        var rawCategory = wsPlatforma.Cell(row, 3).GetString().Trim();
        var name = wsPlatforma.Cell(row, 4).GetString().Trim();
        if (string.IsNullOrWhiteSpace(name)) continue;
        if (name.Contains("Quantidade") || name.Contains("Obrigatórias")) continue;

        var category = MapCategory(rawCategory);
        if (string.IsNullOrEmpty(category))
        {
            Console.WriteLine($"  SKIPPED (excluded category '{rawCategory}'): {name}");
            continue;
        }

        bool isMeta = metaStr.Equals("Sim", StringComparison.OrdinalIgnoreCase);

        // Collect expectations from all roles
        var roleExpectations = new Dictionary<string, Dictionary<string, (string level, bool isRequired)>>();
        foreach (var (role, gradeN, cCol, pCol) in roleGradeCols)
        {
            var levelAbbr = wsPlatforma.Cell(row, cCol).GetString().Trim().ToUpper();
            var preceitoStr = wsPlatforma.Cell(row, pCol).GetString().Trim();
            if (levelAbbr == "N" || string.IsNullOrWhiteSpace(levelAbbr)) continue;
            var level = MapLevel(levelAbbr);
            if (string.IsNullOrEmpty(level)) continue;
            bool isRequired = preceitoStr == "1";
            if (!roleExpectations.ContainsKey(role))
                roleExpectations[role] = new Dictionary<string, (string, bool)>();
            roleExpectations[role][gradeN] = (level, isRequired);
        }

        // Merge into existing skill if name already seen
        if (skillMap.TryGetValue(name, out var existing))
        {
            foreach (var (role, grades) in roleExpectations)
            {
                if (!existing.RoleExpectations.ContainsKey(role))
                    existing.RoleExpectations[role] = new Dictionary<string, (string, bool)>();
                foreach (var (g, val) in grades)
                    existing.RoleExpectations[role][g] = val;
            }
            if (isMeta && !existing.IsMeta)
                skillMap[name] = existing with { IsMeta = true };
        }
        else
        {
            skillMap[name] = new SkillData(name, category, isMeta, roleExpectations);
        }

        // Read user assessments
        foreach (var user in userInfoList)
        {
            var levelAbbr = wsPlatforma.Cell(row, user.LevelCol).GetString().Trim().ToUpper();
            if (levelAbbr == "N" || string.IsNullOrWhiteSpace(levelAbbr)) continue;
            var level = MapLevel(levelAbbr);
            if (string.IsNullOrEmpty(level)) continue;
            userAssessments[user.Email][name] = level;
        }
    }
}

// ─── 3. READ Descritivo por Conceito ─────────────────────────────────────────
var skillDescriptions = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
if (wb.TryGetWorksheet("Descritivo por Conceito", out var wsDesc))
{
    Console.WriteLine("Reading Descritivo por Conceito...");
    int lastRow = wsDesc.LastRowUsed()?.RowNumber() ?? 0;
    for (int row = 3; row <= lastRow; row++)
    {
        var skillName = wsDesc.Cell(row, 2).GetString().Trim();
        if (string.IsNullOrWhiteSpace(skillName)) continue;
        if (!skillDescriptions.ContainsKey(skillName))
            skillDescriptions[skillName] = new Dictionary<string, string>();
        var bronze = wsDesc.Cell(row, 3).GetString().Trim();
        var prata = wsDesc.Cell(row, 4).GetString().Trim();
        var ouro = wsDesc.Cell(row, 5).GetString().Trim();
        if (!string.IsNullOrWhiteSpace(bronze)) skillDescriptions[skillName]["BRONZE"] = bronze;
        if (!string.IsNullOrWhiteSpace(prata))  skillDescriptions[skillName]["PRATA"] = prata;
        if (!string.IsNullOrWhiteSpace(ouro))   skillDescriptions[skillName]["OURO"] = ouro;
    }
}

// ─── 4. GENERATE SQL ─────────────────────────────────────────────────────────
Console.WriteLine("\nGenerating SQL...");
int skillCounter = 0;

sb.AppendLine("-- ============================================================");
sb.AppendLine("-- COMPETÊNCIAS (únicas, sem duplicação)");
sb.AppendLine("-- Vínculo com cargos via skill_expectations.");
sb.AppendLine("-- ============================================================");
sb.AppendLine();

foreach (var skill in skillMap.Values.OrderBy(s => s.Category).ThenBy(s => s.Name))
{
    skillCounter++;
    int roleCount = skill.RoleExpectations.Count;
    var roleNames = string.Join(", ", skill.RoleExpectations.Keys.OrderBy(r => r));
    sb.AppendLine($"-- [{skillCounter}] {skill.Name} ({skill.Category}) -> cargos: {(roleCount > 0 ? roleNames : "nenhum")}");
    sb.AppendLine($"INSERT INTO skills (name, category, is_meta_2026) VALUES ('{Esc(skill.Name)}', '{Esc(skill.Category)}', {(skill.IsMeta ? "TRUE" : "FALSE")});");

    // Expectations for each role/grade
    foreach (var (role, gradeMap) in skill.RoleExpectations)
        foreach (var (grade, (level, isReq)) in gradeMap)
            sb.AppendLine($"INSERT INTO skill_expectations (skill_id, role_id, grade_id, expected_level, is_required) " +
                $"SELECT s.id, r.id, g.id, '{level}', {(isReq ? "TRUE" : "FALSE")} " +
                $"FROM skills s, roles r, grades g " +
                $"WHERE s.name = '{Esc(skill.Name)}' AND r.name = '{role}' AND g.name = '{grade}' " +
                $"ON CONFLICT (skill_id, role_id, grade_id) DO UPDATE SET expected_level = EXCLUDED.expected_level, is_required = EXCLUDED.is_required;");

    // Descriptions (BRONZE, PRATA, OURO) — per role
    if (skillDescriptions.TryGetValue(skill.Name, out var descs))
        foreach (var role in skill.RoleExpectations.Keys)
            foreach (var (descLevel, descText) in descs)
                sb.AppendLine($"INSERT INTO skill_descriptions (skill_id, role_id, level, description) " +
                    $"SELECT s.id, r.id, '{descLevel}', '{Esc(descText)}' FROM skills s, roles r " +
                    $"WHERE s.name = '{Esc(skill.Name)}' AND r.name = '{role}' " +
                    $"ON CONFLICT (skill_id, role_id, level) DO UPDATE SET description = EXCLUDED.description;");
    sb.AppendLine();
}

// ─── 5. USERS ────────────────────────────────────────────────────────────────
sb.AppendLine();
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- COLABORADORES (senha: Mudar@123)");
sb.AppendLine("-- ============================================================");
sb.AppendLine();

var pwHash = BCrypt.Net.BCrypt.HashPassword("Mudar@123").Replace("'", "''");
foreach (var user in userInfoList)
    sb.AppendLine($"INSERT INTO users (id, name, email, password, role_id, grade_id, is_manager, created_at) " +
        $"SELECT gen_random_uuid(), '{Esc(user.Name)}', '{user.Email}', '{pwHash}', " +
        $"(SELECT id FROM roles WHERE name = '{user.Role}'), " +
        $"(SELECT id FROM grades WHERE name = '{user.Grade}'), " +
        $"FALSE, NOW() " +
        $"WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '{user.Email}');");

// ─── 6. ASSESSMENTS ─────────────────────────────────────────────────────────
sb.AppendLine();
sb.AppendLine("-- ============================================================");
sb.AppendLine("-- AVALIAÇÕES (níveis atuais dos colaboradores)");
sb.AppendLine("-- ============================================================");
sb.AppendLine();

foreach (var user in userInfoList)
{
    if (!userAssessments.TryGetValue(user.Email, out var assessmentMap)) continue;
    foreach (var (skillName, level) in assessmentMap)
    {
        // Only insert assessment if skill exists in our map (not excluded)
        if (!skillMap.ContainsKey(skillName)) continue;

        sb.AppendLine($"INSERT INTO skill_assessments (user_id, skill_id, current_level, last_updated) " +
            $"SELECT u.id, s.id, '{level}', NOW() " +
            $"FROM users u, skills s " +
            $"WHERE u.email = '{user.Email}' AND s.name = '{Esc(skillName)}' " +
            $"ON CONFLICT (user_id, skill_id) DO UPDATE SET current_level = EXCLUDED.current_level;");
    }
}

File.WriteAllText(outputPath, sb.ToString(), Encoding.UTF8);
Console.WriteLine($"\n✅ Seed SQL gerado em: {outputPath}");
Console.WriteLine($"   Tamanho: {new FileInfo(outputPath).Length:N0} bytes");
Console.WriteLine($"   Comandos INSERT: {sb.ToString().Split('\n').Count(l => l.Contains("INSERT"))}");
Console.WriteLine($"   Skills únicos: {skillCounter}");
Console.WriteLine($"   Usuários: {userInfoList.Count}");

// Print category breakdown
var catBreakdown = skillMap.Values.GroupBy(s => s.Category).OrderBy(g => g.Key);
foreach (var g in catBreakdown)
    Console.WriteLine($"     {g.Key}: {g.Count()} skills");

// ── Helpers (local functions - must precede type declarations) ────────────────
static string GenerateEmail(string fullName)
{
    var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length < 2) return fullName.ToLower().Replace(" ", ".") + "@empresa.com";
    var first = parts[0].ToLower();
    var skipSuffixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "JUNIOR", "NETO", "FILHO", "SOBRINHO" };
    var last = parts.Last();
    for (int i = parts.Length - 1; i >= 1; i--)
    {
        if (!skipSuffixes.Contains(parts[i])) { last = parts[i]; break; }
    }
    return RemoveAccents($"{first}.{last.ToLower()}@empresa.com");
}

static string RemoveAccents(string text)
{
    var normalized = text.Normalize(NormalizationForm.FormD);
    var sb2 = new StringBuilder();
    foreach (var c in normalized)
    {
        if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
            sb2.Append(c);
    }
    return sb2.ToString().Normalize(NormalizationForm.FormC);
}

// ── Records (type declarations at end of file) ──────────────────────────────
record SkillData(string Name, string Category, bool IsMeta,
    Dictionary<string, Dictionary<string, (string level, bool isRequired)>> RoleExpectations);
record UserInfo(string Name, string Email, string Role, string Grade, int LevelCol, int MetaCol);
