"""
RadRelay Change Healthcare PACS Bridge Daemon
Pushes verified incoming DICOM studies from RadRelay Cloud Vault to Change Healthcare PACS (Horizon)
via standard DICOM C-STORE protocol (SCU).
"""

import sys
import os
import time
import json
import logging
from pathlib import Path
from pynetdicom import AE, StoragePresentationContexts, VerificationPresentationContexts
import pydicom

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("RadRelayPACSBridge")

# Configuration for Change Healthcare (Horizon) PACS AE node (AE Title max 16 chars)
DEFAULT_CONFIG = {
    "local_aet": "RADRELAY_SCU",
    "target_pacs_aet": "CHANGE_HORIZON", # Exactly 14 chars <= 16
    "target_pacs_host": "127.0.0.1",
    "target_pacs_port": 11112,
    "cloud_vault_url": "https://radrelay.pages.dev/api/studies",
    "polling_interval_sec": 30,
}

class ChangePacsRelay:
    def __init__(self, config=None):
        self.config = {**DEFAULT_CONFIG, **(config or {})}
        self.ae = AE(ae_title=self.config["local_aet"])
        self.ae.requested_contexts = StoragePresentationContexts + VerificationPresentationContexts
        logger.info(f"Initialized RadRelay SCU node: {self.config['local_aet']}")

    def verify_connection(self):
        """DICOM C-ECHO verification to test PACS availability."""
        logger.info(f"Pinging PACS {self.config['target_pacs_aet']} at {self.config['target_pacs_host']}:{self.config['target_pacs_port']}...")
        assoc = self.ae.associate(
            self.config["target_pacs_host"],
            self.config["target_pacs_port"],
            ae_title=self.config["target_pacs_aet"]
        )
        if assoc.is_established:
            status = assoc.send_c_echo()
            assoc.release()
            logger.info(f"C-ECHO Response: {status.Status if status else 'OK'}")
            return True
        else:
            logger.warning(f"Could not establish association with {self.config['target_pacs_aet']}.")
            return False

    def push_dataset(self, ds):
        """Executes DICOM C-STORE push of a dataset to Change PACS."""
        assoc = self.ae.associate(
            self.config["target_pacs_host"],
            self.config["target_pacs_port"],
            ae_title=self.config["target_pacs_aet"]
        )
        if assoc.is_established:
            status = assoc.send_c_store(ds)
            assoc.release()
            if status and status.Status == 0x0000:
                logger.info(f"SUCCESS: C-STORE accepted by Change Healthcare PACS for Instance {ds.get('InstanceNumber', '1')}")
                return True
            else:
                logger.error(f"FAILURE: C-STORE rejected with status: {status}")
                return False
        else:
            logger.error("Association rejected by PACS host.")
            return False

if __name__ == "__main__":
    relay = ChangePacsRelay()
    print("=================================================================")
    print("RadRelay Change Healthcare PACS Bridge Daemon Active")
    print(f"Local SCU AE Title : {DEFAULT_CONFIG['local_aet']}")
    print(f"Target PACS AE Title: {DEFAULT_CONFIG['target_pacs_aet']}")
    print(f"Cloud Vault API    : {DEFAULT_CONFIG['cloud_vault_url']}")
    print("=================================================================")
    if len(sys.argv) > 1 and sys.argv[1] == "--echo":
        success = relay.verify_connection()
        sys.exit(0 if success else 1)
