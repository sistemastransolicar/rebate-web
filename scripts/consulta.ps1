<#
    consulta.ps1 — ejecuta un archivo .sql contra SQL Server y guarda el
    resultado como CSV para que Claude lo pueda leer.

    SOLO LECTURA: rechaza cualquier script que contenga instrucciones de
    escritura (INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/EXEC/MERGE).

    Uso:
        .\scripts\consulta.ps1 -Sql sql\consultas\01_verificacion.sql
        .\scripts\consulta.ps1 -Sql ... -Base dbsyscomTras -Usuario syscom -Clave ***

    Por defecto usa autenticación de Windows contra 127.0.0.1.
#>
param(
    [Parameter(Mandatory=$true)][string]$Sql,
    [string]$Salida   = "",
    [string]$Servidor = "127.0.0.1",
    [string]$Base     = "dbsyscomTras",
    [string]$Usuario  = "",
    [string]$Clave    = "",
    [int]$Timeout     = 300
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $Sql)) { throw "No existe el archivo: $Sql" }
$texto = Get-Content $Sql -Raw -Encoding UTF8

# --- Guardia de solo lectura ---------------------------------------------
$prohibidas = 'INSERT\s','UPDATE\s','DELETE\s','DROP\s','ALTER\s','CREATE\s',
              'TRUNCATE\s','MERGE\s','EXEC\s','EXECUTE\s','GRANT\s','DENY\s'
$sinComentarios = [regex]::Replace($texto, '(?s)/\*.*?\*/', '')
$sinComentarios = [regex]::Replace($sinComentarios, '(?m)--.*$', '')
foreach ($p in $prohibidas) {
    if ($sinComentarios -match "(?im)(^|\s)$p") {
        throw "BLOQUEADO: el script contiene '$($p.Trim())'. Este puente es solo de lectura."
    }
}

if (-not $Salida) {
    $nombre = [IO.Path]::GetFileNameWithoutExtension($Sql)
    $Salida = Join-Path $raiz "sql\resultados\$nombre.csv"
}
New-Item -ItemType Directory -Force -Path (Split-Path $Salida) | Out-Null

if ($Usuario) {
    $cs = "Server=$Servidor;Database=$Base;User Id=$Usuario;Password=$Clave;TrustServerCertificate=True;"
} else {
    $cs = "Server=$Servidor;Database=$Base;Integrated Security=SSPI;TrustServerCertificate=True;"
}

Write-Host "Servidor : $Servidor / $Base"
Write-Host "Consulta : $Sql"

$cn = New-Object System.Data.SqlClient.SqlConnection $cs
try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText    = $texto
    $cmd.CommandTimeout = $Timeout
    $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
    $ds = New-Object System.Data.DataSet
    $reloj = [Diagnostics.Stopwatch]::StartNew()
    [void]$da.Fill($ds)
    $reloj.Stop()

    $i = 0
    foreach ($t in $ds.Tables) {
        $destino = if ($ds.Tables.Count -gt 1) {
            [IO.Path]::ChangeExtension($Salida, $null) + "_$i.csv"
        } else { $Salida }
        $t | Export-Csv -Path $destino -NoTypeInformation -Encoding UTF8
        Write-Host ("  -> {0}  ({1} filas)" -f $destino, $t.Rows.Count) -ForegroundColor Green
        $i++
    }
    Write-Host ("Listo en {0:N1} s" -f $reloj.Elapsed.TotalSeconds) -ForegroundColor Cyan
}
finally { $cn.Close() }
