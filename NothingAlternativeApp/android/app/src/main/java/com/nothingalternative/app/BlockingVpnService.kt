package com.nothingalternative.app

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class BlockingVpnService : VpnService() {

    companion object {
        const val ACTION_START  = "com.nothingalternative.app.START_VPN"
        const val ACTION_STOP   = "com.nothingalternative.app.STOP_VPN"
        const val EXTRA_BLOCKED = "blocked_sites"
        private const val TAG   = "BlockingVpnService"

        private const val VPN_ADDRESS   = "10.0.0.2"
        private const val DNS_INTERCEPT = "10.0.0.1"

        private val UPSTREAM_DNS    = InetAddress.getByName("1.1.1.1")
        private const val DNS_PORT  = 53
        private const val BUF_SIZE  = 2048
        private const val TIMEOUT   = 3_000

        private val dohProviders = setOf(
            "dns.google",
            "dns64.dns.google",
            "cloudflare-dns.com",
            "doh.opendns.com",
            "firefox.settings.services.mozilla.com",
            "edge.microsoft.com",
            "dns.nextdns.io"
        )

        private val vpnBypassDomains = setOf(
            "railway.app",
            "googleapis.com",
            "accounts.google.com",
            "oauth2.googleapis.com",
            "firebaseapp.com",
            "gstatic.com"
        )
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private val running = AtomicBoolean(false)
    private var blockedSites: List<String> = emptyList()
    private lateinit var executor: ExecutorService

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP  -> { 
                stopVpn()
                stopSelf() 
                return START_NOT_STICKY }
            ACTION_START -> {
                blockedSites = intent.getStringArrayExtra(EXTRA_BLOCKED)?.toList() ?: emptyList()
                Log.d(TAG, "Starting VPN, blocklist=$blockedSites")
                if (running.get()) {
                    Log.d(TAG, "VPN already running, updating blocklist only")
                    return START_STICKY
                }
                startVpn()
            }
        }
        return START_STICKY
    }

    override fun onRevoke() {
        Log.d(TAG, "VPN revoked")
        stopVpn()
        startService(Intent(this, BlockingForegroundService::class.java).apply {
            action = BlockingForegroundService.ACTION_STOP
        })
    }

    override fun onDestroy() { stopVpn(); super.onDestroy() }

    private fun startVpn() {
        if (running.getAndSet(true)) return
        try {
            vpnInterface = Builder()
                .setSession("NothingAlternative")
                .addAddress(VPN_ADDRESS, 32)
                .addRoute(DNS_INTERCEPT, 32)
                .addDnsServer(DNS_INTERCEPT)
                .addDisallowedApplication(packageName)
                .allowBypass()
                .setBlocking(true)
                .establish()
        } catch (e: Exception) {
            Log.e(TAG, "establish() failed", e); running.set(false); return
        }
        executor = Executors.newCachedThreadPool()
        startTunLoop()
    }

    private fun stopVpn() {
        if (!running.getAndSet(false)) return
        vpnInterface?.close(); vpnInterface = null
        if (::executor.isInitialized) executor.shutdownNow()
        Log.d(TAG, "VPN stopped")
    }

    private fun startTunLoop() {
        val fd = vpnInterface?.fileDescriptor ?: return
        val fis = FileInputStream(fd)
        val fos = FileOutputStream(fd)

        executor.submit {
            val buf = ByteArray(BUF_SIZE)
            try {
                while (running.get()) {
                    val n = fis.read(buf)
                    if (n < 28) continue

                    val pkt = buf.copyOf(n)

                    if ((pkt[0].toInt() ushr 4) != 4) continue
                    val ipHdrLen = (pkt[0].toInt() and 0x0F) * 4
                    if (pkt[9].toInt() and 0xFF != 17) continue

                    val udpOff = ipHdrLen
                    if (n < udpOff + 8) continue
                    val srcPort = u16(pkt, udpOff)
                    val dstPort = u16(pkt, udpOff + 2)
                    if (dstPort != DNS_PORT) continue

                    val srcIp  = pkt.copyOfRange(12, 16)
                    val dstIp  = pkt.copyOfRange(16, 20)

                    val dnsOff = udpOff + 8
                    if (n <= dnsOff) continue
                    val dnsQuery = pkt.copyOfRange(dnsOff, n)

                    executor.submit {
                        handleDnsQuery(dnsQuery, srcIp, srcPort, dstIp, fos)
                    }
                }
            } catch (_: Exception) { }
        }
    }

    // ── Only change: show overlay when a domain is blocked ───────────────────
    private fun handleDnsQuery(
        query:   ByteArray,
        srcIp:   ByteArray,
        srcPort: Int,
        dstIp:   ByteArray,
        fos:     FileOutputStream
    ) {
        val domain = try { DnsPacketParser.extractDomain(query) } catch (_: Exception) { null }
        Log.d(TAG, "DNS query: $domain")

        val dnsReply: ByteArray = when {
            domain == null          -> buildNxDomain(query)
            isDomainBlocked(domain) -> {
                Log.i(TAG, "BLOCKED: $domain")
                if (!OverlayManager.isShowing() && !OverlayManager.isCoolingDown()) {
                    // Only show overlay if a browser is actually in the foreground
                    if (OverlayManager.isBrowserInForeground(this)) {
                        OverlayManager.show(this, domain, isWebsite = true)
                    }
                }
                buildNxDomain(query)
            }
            else -> forwardToUpstream(query) ?: buildNxDomain(query)
        }

        val rawPacket = buildIpUdpPacket(
            srcIp   = dstIp,
            dstIp   = srcIp,
            srcPort = DNS_PORT,
            dstPort = srcPort,
            payload = dnsReply
        )

        synchronized(fos) {
            try { fos.write(rawPacket) } catch (e: Exception) {
                Log.w(TAG, "TUN write failed", e)
            }
        }
    }

    private fun isDomainBlocked(domain: String): Boolean {
        val lower = domain.lowercase()
        if (vpnBypassDomains.any { lower.contains(it) }) return false
        if (dohProviders.any { lower.contains(it) }) return true
        return blockedSites.any { lower.contains(it.lowercase()) }
    }

    private fun forwardToUpstream(query: ByteArray): ByteArray? = try {
        val sock = DatagramSocket()
        protect(sock)
        sock.soTimeout = TIMEOUT
        sock.send(DatagramPacket(query, query.size, UPSTREAM_DNS, DNS_PORT))
        val buf = ByteArray(BUF_SIZE)
        val recv = DatagramPacket(buf, buf.size)
        sock.receive(recv)
        sock.close()
        recv.data.copyOf(recv.length)
    } catch (e: Exception) { Log.w(TAG, "Upstream DNS failed", e); null }

    private fun buildNxDomain(query: ByteArray): ByteArray {
        val qSection = if (query.size > 12) query.copyOfRange(12, query.size) else ByteArray(0)
        return ByteArray(12 + qSection.size).also { r ->
            r[0] = query[0]; r[1] = query[1]
            r[2] = 0x81.toByte(); r[3] = 0x83.toByte()
            r[4] = 0x00;          r[5] = 0x01
            qSection.copyInto(r, 12)
        }
    }

    private fun buildIpUdpPacket(
        srcIp:   ByteArray,
        dstIp:   ByteArray,
        srcPort: Int,
        dstPort: Int,
        payload: ByteArray
    ): ByteArray {
        val totalLen = 20 + 8 + payload.size
        val udpLen   = 8 + payload.size
        val pkt      = ByteArray(totalLen)

        pkt[0]  = 0x45.toByte()
        pkt[1]  = 0x00
        pkt[2]  = (totalLen ushr 8).toByte()
        pkt[3]  = (totalLen and 0xFF).toByte()
        pkt[4]  = 0x00; pkt[5] = 0x00
        pkt[6]  = 0x40; pkt[7] = 0x00
        pkt[8]  = 64
        pkt[9]  = 17
        pkt[10] = 0x00; pkt[11] = 0x00
        srcIp.copyInto(pkt, 12)
        dstIp.copyInto(pkt, 16)

        val ipCsum = ipChecksum(pkt, 0, 20)
        pkt[10] = (ipCsum ushr 8).toByte()
        pkt[11] = (ipCsum and 0xFF).toByte()

        val u = 20
        pkt[u]   = (srcPort ushr 8).toByte()
        pkt[u+1] = (srcPort and 0xFF).toByte()
        pkt[u+2] = (dstPort ushr 8).toByte()
        pkt[u+3] = (dstPort and 0xFF).toByte()
        pkt[u+4] = (udpLen ushr 8).toByte()
        pkt[u+5] = (udpLen and 0xFF).toByte()
        pkt[u+6] = 0x00; pkt[u+7] = 0x00

        payload.copyInto(pkt, 28)

        return pkt
    }

    private fun ipChecksum(data: ByteArray, offset: Int, length: Int): Int {
        var sum = 0
        var i = offset
        while (i < offset + length - 1) {
            sum += ((data[i].toInt() and 0xFF) shl 8) or (data[i + 1].toInt() and 0xFF)
            i += 2
        }
        if ((length and 1) != 0) {
            sum += (data[offset + length - 1].toInt() and 0xFF) shl 8
        }
        while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
        return sum.inv() and 0xFFFF
    }

    private fun u16(buf: ByteArray, off: Int) =
        ((buf[off].toInt() and 0xFF) shl 8) or (buf[off + 1].toInt() and 0xFF)
}