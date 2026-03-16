using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly Data.DapperContext _ctx;

    public CategoryRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<Category?> GetByIdAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<Category>(
            "SELECT id, company_id AS CompanyId, name FROM categories WHERE id = @id",
            new { id });
    }

    public async Task<IEnumerable<Category>> GetByCompanyIdAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Category>(
            "SELECT id, company_id AS CompanyId, name FROM categories WHERE company_id = @companyId ORDER BY name",
            new { companyId });
    }

    public async Task<int> CountByCompanyIdAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM categories WHERE company_id = @companyId",
            new { companyId });
    }

    public async Task<int> CreateAsync(Category category)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO categories (company_id, name) VALUES (@CompanyId, @Name) RETURNING id",
            new { category.CompanyId, category.Name });
    }

    public async Task UpdateAsync(Category category)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync(
            "UPDATE categories SET name = @Name WHERE id = @Id",
            new { category.Id, category.Name });
    }

    public async Task<int> CountSkillsByCategoryIdAsync(int categoryId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM skills WHERE category_id = @categoryId",
            new { categoryId });
    }

    public async Task DeleteAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM categories WHERE id = @id", new { id });
    }
}
