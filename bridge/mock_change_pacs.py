"""
RadRelay In-Memory DICOM SCP Mock Server
Simulates Change Healthcare Horizon PACS node listening on port 11112 for C-STORE / C-ECHO testing.
"""

import sys
import logging
from pynetdicom import AE, evt, StoragePresentationContexts, VerificationPresentationContexts

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [ChangePACS-SCP] %(message)s")
logger = logging.getLogger("MockChangePACS")

def handle_echo(event):
    logger.info(f"Received C-ECHO from AE: {event.assoc.requestor.ae_title}")
    return 0x0000

def handle_store(event):
    ds = event.dataset
    ds.file_meta = event.file_meta
    logger.info(f"Received C-STORE: Patient {ds.get('PatientName', 'Unknown')} ({ds.get('PatientID', 'Unknown')}), Modality: {ds.get('Modality', 'MR')}, Instance {ds.get('InstanceNumber', 1)}")
    return 0x0000

def run_server(port=11112):
    ae = AE(ae_title="CHANGE_HORIZON")
    ae.supported_contexts = StoragePresentationContexts + VerificationPresentationContexts
    handlers = [
        (evt.EVT_C_ECHO, handle_echo),
        (evt.EVT_C_STORE, handle_store)
    ]
    logger.info(f"Starting Mock Change Healthcare PACS on port {port} (AE: CHANGE_HORIZON)...")
    ae.start_server(("", port), evt_handlers=handlers, block=True)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 11112
    run_server(port)
