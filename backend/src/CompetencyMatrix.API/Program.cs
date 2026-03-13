using System.Text;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Application.Services;
using CompetencyMatrix.Infrastructure.Data;
using CompetencyMatrix.Infrastructure.Repositories;
using CompetencyMatrix.Infrastructure.Security;
using CompetencyMatrix.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using HealthChecks.NpgSql;
using Serilog;
using Serilog.Context;
using System.Text.Json;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services);
});

// ─── Infrastructure ───────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionString 'Default' not found.");

builder.Services.AddSingleton(new DapperContext(connectionString));

// ─── Health Checks ─────────────────────────────────────────────────────────────
builder.Services
    .AddHealthChecks()
    .AddNpgSql(
        connectionString,
        name: "postgres",
        tags: new[] { "ready" });

// ─── Repositories ─────────────────────────────────────────────────────────────
builder.Services.AddScoped<IUserRepository,       UserRepository>();
builder.Services.AddScoped<ISkillRepository,      SkillRepository>();
builder.Services.AddScoped<IAssessmentRepository, AssessmentRepository>();
builder.Services.AddScoped<IRoleGradeRepository,  RoleGradeRepository>();
builder.Services.AddScoped<ICompanyRepository,    CompanyRepository>();
builder.Services.AddScoped<ITeamRepository,       TeamRepository>();
builder.Services.AddScoped<IAuditLogRepository,   AuditLogRepository>();

// ─── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService,       AuthService>();
builder.Services.AddScoped<IUserService,       UserService>();
builder.Services.AddScoped<ISkillService,      SkillService>();
builder.Services.AddScoped<IAssessmentService, AssessmentService>();
builder.Services.AddScoped<IRoleGradeService,  RoleGradeService>();
builder.Services.AddScoped<IRoleService,       RoleService>();
builder.Services.AddScoped<ICompanyService,    CompanyService>();
builder.Services.AddScoped<ITeamService,       TeamService>();
builder.Services.AddScoped<IAuditService,      ApiAuditService>();
builder.Services.AddSingleton<IJwtService,     JwtService>();

builder.Services.AddHttpContextAccessor();

// ─── JWT ──────────────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
    throw new InvalidOperationException("Jwt:Secret not configured. In production set Jwt__Secret (min. 32 characters).");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var path = httpContext.Request.Path.Value ?? string.Empty;

        if (path.StartsWith("/health", StringComparison.OrdinalIgnoreCase))
            return RateLimitPartition.GetNoLimiter("health");

        if (path.StartsWith("/auth/login", StringComparison.OrdinalIgnoreCase))
            return RateLimitPartition.GetNoLimiter("login");

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 200,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new
        {
            error = "Muitas requisições. Tente novamente mais tarde."
        });

        await context.HttpContext.Response.WriteAsync(payload, token);
    };
});

// ─── CORS (origens por configuração; fallback localhost em dev) ───────────────
var corsOrigins = builder.Configuration["Cors:AllowedOrigins"];
if (string.IsNullOrWhiteSpace(corsOrigins))
    corsOrigins = "http://localhost:5173;http://localhost:5175;http://localhost:3000";
var origins = corsOrigins.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(origins)
     .AllowAnyMethod()
     .AllowAnyHeader()
));

var app = builder.Build();

app.UseSerilogRequestLogging();

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// ─── Logging context (User/Company) ────────────────────────────────────────────
app.Use(async (context, next) =>
{
    if (context.User?.Identity?.IsAuthenticated == true)
    {
        var userId = context.User.FindFirst("sub")?.Value ?? context.User.Identity?.Name;
        var companyId = context.User.FindFirst("companyId")?.Value;

        using (LogContext.PushProperty("UserId", userId ?? string.Empty))
        using (LogContext.PushProperty("CompanyId", companyId ?? string.Empty))
        {
            await next();
        }
    }
    else
    {
        await next();
    }
});

// ─── Health Endpoints ──────────────────────────────────────────────────────────
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers();

app.Run();
