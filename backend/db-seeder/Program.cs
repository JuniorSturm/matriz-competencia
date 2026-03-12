using System.Data;
using CompetencyMatrix.Infrastructure.Data;

// Seeder simples para (re)criar o schema e aplicar o seed 002_seed_data.sql

Console.WriteLine("Iniciando seeder da base competency_matrix...");

// Mesma connection string do appsettings.json
const string connectionString = "Host=localhost;Port=5433;Database=competency_matrix;Username=postgres;Password=postgres";

// Caminho raiz do repositório (ajustado para o ambiente atual)
var rootPath = @"c:\JuniorSturm\matriz-competencia";
var migrationsPath = Path.Combine(rootPath, "database", "migrations");

var ddlPath = Path.Combine(migrationsPath, "001_create_tables.sql");
var seedPath = Path.Combine(migrationsPath, "002_seed_data.sql");

if (!File.Exists(ddlPath) || !File.Exists(seedPath))
{
    Console.Error.WriteLine("Arquivos de migração não encontrados. Verifique os caminhos de 001_create_tables.sql e 002_seed_data.sql.");
    return 1;
}

Console.WriteLine($"Usando migrations em: {migrationsPath}");

var ddlSql = await File.ReadAllTextAsync(ddlPath);
var seedSql = await File.ReadAllTextAsync(seedPath);
var fullSql = ddlSql + Environment.NewLine + seedSql;

var ctx = new DapperContext(connectionString);
using var conn = ctx.CreateConnection();
using var cmd = conn.CreateCommand();
cmd.CommandType = CommandType.Text;
cmd.CommandText = fullSql;

Console.WriteLine("Executando DDL + seed...");
cmd.ExecuteNonQuery();

Console.WriteLine("Seed concluído com sucesso.");
return 0;

