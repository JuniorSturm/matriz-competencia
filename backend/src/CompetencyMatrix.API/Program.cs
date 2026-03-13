using System.Text;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Application.Services;
using CompetencyMatrix.Infrastructure.Data;
using CompetencyMatrix.Infrastructure.Repositories;
using CompetencyMatrix.Infrastructure.Security;
using CompetencyMatrix.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ─── Infrastructure ───────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionString 'Default' not found.");

builder.Services.AddSingleton(new DapperContext(connectionString));

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
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret not configured.");

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

// ─── CORS (permitir frontend em dev) ─────────────────────────────────────────
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "http://localhost:5175", "http://localhost:3000")
     .AllowAnyMethod()
     .AllowAnyHeader()
));

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
