$ports = 8080, 8081, 8083, 8084, 8091, 9411, 8848, 6379, 3306, 3000
foreach ($p in $ports) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect("localhost", $p)
        Write-Output "$p`: open"
        $tcp.Close()    } catch {
        Write-Output "$p`: closed"
    }
}
