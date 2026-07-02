package com.lmscrm.backend.service.camera;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class OnvifDiscoveryService {

    private static final String WS_DISCOVERY_MULTICAST = "239.255.255.250";
    private static final int WS_DISCOVERY_PORT = 3702;

    /**
     * Broadcasts a UDP discovery probe to search for ONVIF IP cameras on the local network.
     */
    public List<DiscoveredCamera> discoverLocalCameras() {
        List<DiscoveredCamera> discovered = new ArrayList<>();
        
        String probePayload = 
            "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:a=\"http://www.w3.org/2005/08/addressing\">" +
            "  <s:Header>" +
            "    <a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>" +
            "    <a:MessageID>urn:uuid:" + UUID.randomUUID() + "</a:MessageID>" +
            "    <a:To>urn:schemas-xmlsoap.org:ws:2005/04/discovery</a:To>" +
            "  </s:Header>" +
            "  <s:Body>" +
            "    <Probe xmlns=\"http://schemas.xmlsoap.org/ws/2005/04/discovery\">" +
            "      <Types>dn:NetworkVideoTransmitter</Types>" +
            "    </Probe>" +
            "  </s:Body>" +
            "</s:Envelope>";

        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(3000); // 3 seconds timeout
            byte[] buffer = probePayload.getBytes();
            
            InetAddress address = InetAddress.getByName(WS_DISCOVERY_MULTICAST);
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length, address, WS_DISCOVERY_PORT);
            
            socket.send(packet);
            
            byte[] rxBuf = new byte[8192];
            while (true) {
                DatagramPacket rxPacket = new DatagramPacket(rxBuf, rxBuf.length);
                socket.receive(rxPacket);
                
                String responseXml = new String(rxPacket.getData(), 0, rxPacket.getLength());
                String ipAddress = rxPacket.getAddress().getHostAddress();
                
                discovered.add(DiscoveredCamera.builder()
                    .ipAddress(ipAddress)
                    .endpointUrl("http://" + ipAddress + "/onvif/device_service")
                    .rawXml(responseXml)
                    .build());
            }
        } catch (SocketTimeoutException e) {
            log.info("ONVIF camera discovery completed (Socket timeout).");
        } catch (Exception e) {
            log.error("Failed to run ONVIF auto-discovery probe", e);
        }
        
        return discovered;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DiscoveredCamera {
        private String ipAddress;
        private String endpointUrl;
        private String rawXml;
    }
}
