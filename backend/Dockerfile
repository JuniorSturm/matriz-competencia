FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/CompetencyMatrix.API/CompetencyMatrix.API.csproj",           "CompetencyMatrix.API/"]
COPY ["src/CompetencyMatrix.Application/CompetencyMatrix.Application.csproj", "CompetencyMatrix.Application/"]
COPY ["src/CompetencyMatrix.Domain/CompetencyMatrix.Domain.csproj",          "CompetencyMatrix.Domain/"]
COPY ["src/CompetencyMatrix.Infrastructure/CompetencyMatrix.Infrastructure.csproj", "CompetencyMatrix.Infrastructure/"]

# Garante que a pasta de fallback de pacotes usada nos assets exista no ambiente Linux
RUN mkdir -p "C:\Program Files (x86)\Microsoft Visual Studio\Shared\NuGetPackages"

RUN dotnet restore "CompetencyMatrix.API/CompetencyMatrix.API.csproj"

COPY src/ .

RUN dotnet publish "CompetencyMatrix.API/CompetencyMatrix.API.csproj" \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CompetencyMatrix.API.dll"]
