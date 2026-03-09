using System.Data;
using Dapper;
using Npgsql;

namespace CompetencyMatrix.Infrastructure.Data;

public class DapperContext
{
    private readonly string _connectionString;

    static DapperContext()
    {
        // Mapeia automaticamente snake_case do PostgreSQL para PascalCase do C#
        DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    public DapperContext(string connectionString)
    {
        _connectionString = connectionString;
    }

    public IDbConnection CreateConnection() =>
        new NpgsqlConnection(_connectionString);
}
