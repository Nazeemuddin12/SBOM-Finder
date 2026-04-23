from app import models


REAL_ITEMS = [
    {
        "name": "nginx",
        "item_type": "application",
        "category": "Web Server",
        "manufacturer": "F5 Inc",
        "developer": "Igor Sysoev",
        "version": "1.25.3",
        "description": "High-performance HTTP server and reverse proxy",
        "components": [
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("pcre2", "10.42", "PCRE2 Project", "BSD-2-Clause"),
            ("zlib", "1.3.1", "Jean-loup Gailly", "Zlib"),
            ("libcrypto", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("libssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("glibc", "2.38", "GNU Project", "LGPL-2.1"),
        ],
    },
    {
        "name": "Apache HTTP Server",
        "item_type": "application",
        "category": "Web Server",
        "manufacturer": "Apache Software Foundation",
        "developer": "Apache Software Foundation",
        "version": "2.4.58",
        "description": "World's most popular web server software",
        "components": [
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("apr", "1.7.4", "Apache Software Foundation", "Apache-2.0"),
            ("apr-util", "1.6.3", "Apache Software Foundation", "Apache-2.0"),
            ("pcre2", "10.42", "PCRE2 Project", "BSD-2-Clause"),
            ("zlib", "1.3.1", "Jean-loup Gailly", "Zlib"),
            ("libxml2", "2.11.5", "GNOME Project", "MIT"),
            ("lua", "5.4.6", "PUC-Rio", "MIT"),
        ],
    },
    {
        "name": "PostgreSQL",
        "item_type": "application",
        "category": "Database",
        "manufacturer": "PostgreSQL Global Development Group",
        "developer": "PostgreSQL Global Development Group",
        "version": "16.1",
        "description": "Advanced open source relational database",
        "components": [
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("readline", "8.2", "Free Software Foundation", "GPL-3.0"),
            ("zlib", "1.3.1", "Jean-loup Gailly", "Zlib"),
            ("libxml2", "2.11.5", "GNOME Project", "MIT"),
            ("icu", "73.2", "Unicode Consortium", "Unicode-DFS-2016"),
            ("krb5", "1.21.2", "MIT Kerberos Team", "MIT"),
        ],
    },
    {
        "name": "Redis",
        "item_type": "application",
        "category": "Cache Database",
        "manufacturer": "Redis Ltd",
        "developer": "Salvatore Sanfilippo",
        "version": "7.2.3",
        "description": "In-memory data structure store",
        "components": [
            ("jemalloc", "5.3.0", "Jason Evans", "BSD-2-Clause"),
            ("hiredis", "1.2.0", "Redis Ltd", "BSD-3-Clause"),
            ("lua", "5.1.5", "PUC-Rio", "MIT"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
        ],
    },
    {
        "name": "Docker Engine",
        "item_type": "application",
        "category": "Container Runtime",
        "manufacturer": "Docker Inc",
        "developer": "Docker Inc",
        "version": "24.0.7",
        "description": "Container platform for building and running applications",
        "components": [
            ("containerd", "1.7.8", "CNCF", "Apache-2.0"),
            ("runc", "1.1.9", "Open Container Initiative", "Apache-2.0"),
            ("golang", "1.21.3", "Google LLC", "BSD-3-Clause"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("tini", "0.19.0", "Thomas Orozco", "MIT"),
        ],
    },
    {
        "name": "Kubernetes",
        "item_type": "application",
        "category": "Container Orchestration",
        "manufacturer": "Cloud Native Computing Foundation",
        "developer": "Google LLC",
        "version": "1.28.3",
        "description": "Open source container orchestration system",
        "components": [
            ("golang", "1.21.3", "Google LLC", "BSD-3-Clause"),
            ("etcd", "3.5.9", "CNCF", "Apache-2.0"),
            ("containerd", "1.7.8", "CNCF", "Apache-2.0"),
            ("coredns", "1.11.1", "CNCF", "Apache-2.0"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("grpc", "1.59.2", "Google LLC", "Apache-2.0"),
        ],
    },
    {
        "name": "Django",
        "item_type": "application",
        "category": "Web Framework",
        "manufacturer": "Django Software Foundation",
        "developer": "Django Software Foundation",
        "version": "4.2.7",
        "description": "High-level Python web framework",
        "components": [
            ("python", "3.11.6", "Python Software Foundation", "PSF-2.0"),
            ("sqlparse", "0.4.4", "Andi Albrecht", "BSD-3-Clause"),
            ("asgiref", "3.7.2", "Django Software Foundation", "BSD-3-Clause"),
            ("cryptography", "41.0.5", "Python Cryptographic Authority", "Apache-2.0"),
            ("psycopg2", "2.9.9", "Federico Di Gregorio", "LGPL-3.0"),
        ],
    },
    {
        "name": "React",
        "item_type": "application",
        "category": "Frontend Framework",
        "manufacturer": "Meta Platforms Inc",
        "developer": "Meta Platforms Inc",
        "version": "18.2.0",
        "description": "JavaScript library for building user interfaces",
        "components": [
            ("loose-envify", "1.4.0", "Andres Suarez", "MIT"),
            ("scheduler", "0.23.0", "Meta Platforms Inc", "MIT"),
            ("react-dom", "18.2.0", "Meta Platforms Inc", "MIT"),
            ("prop-types", "15.8.1", "Meta Platforms Inc", "MIT"),
        ],
    },
    {
        "name": "Raspberry Pi OS",
        "item_type": "device",
        "category": "Single Board Computer OS",
        "manufacturer": "Raspberry Pi Foundation",
        "developer": "Raspberry Pi Foundation",
        "version": "12 Bookworm",
        "description": "Official OS for Raspberry Pi devices based on Debian",
        "components": [
            ("linux-kernel", "6.1.61", "Linux Foundation", "GPL-2.0"),
            ("u-boot", "2023.10", "DENX Software Engineering", "GPL-2.0"),
            ("busybox", "1.36.1", "Bruce Perens", "GPL-2.0"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("systemd", "254", "systemd Project", "LGPL-2.1"),
            ("python3", "3.11.6", "Python Software Foundation", "PSF-2.0"),
            ("bash", "5.2.15", "Free Software Foundation", "GPL-3.0"),
            ("curl", "8.4.0", "Daniel Stenberg", "curl"),
            ("openssh", "9.5", "OpenBSD Project", "BSD-2-Clause"),
        ],
    },
    {
        "name": "OpenWrt",
        "item_type": "device",
        "category": "Router Firmware",
        "manufacturer": "OpenWrt Project",
        "developer": "OpenWrt Community",
        "version": "23.05.1",
        "description": "Linux-based firmware for embedded devices especially routers",
        "components": [
            ("linux-kernel", "5.15.137", "Linux Foundation", "GPL-2.0"),
            ("busybox", "1.36.1", "Bruce Perens", "GPL-2.0"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("dnsmasq", "2.89", "Simon Kelley", "GPL-2.0"),
            ("dropbear", "2022.83", "Matt Johnston", "MIT"),
            ("iptables", "1.8.9", "Netfilter Core Team", "GPL-2.0"),
            ("luci", "23.05", "OpenWrt Project", "Apache-2.0"),
            ("wpad", "2023-09-01", "Jouni Malinen", "BSD-3-Clause"),
        ],
    },
    {
        "name": "Android AOSP",
        "item_type": "device",
        "category": "Mobile Operating System",
        "manufacturer": "Google LLC",
        "developer": "Google LLC",
        "version": "14.0",
        "description": "Android Open Source Project base system",
        "components": [
            ("linux-kernel", "6.1.25", "Linux Foundation", "GPL-2.0"),
            ("bionic-libc", "14.0", "Google LLC", "BSD-2-Clause"),
            ("art-runtime", "14.0", "Google LLC", "Apache-2.0"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("sqlite", "3.43.2", "D. Richard Hipp", "blessing"),
            ("v8-engine", "11.8", "Google LLC", "BSD-3-Clause"),
            ("freetype", "2.13.2", "FreeType Project", "FTL"),
        ],
    },
    {
        "name": "Ubuntu Server",
        "item_type": "device",
        "category": "Server Operating System",
        "manufacturer": "Canonical Ltd",
        "developer": "Canonical Ltd",
        "version": "22.04.3 LTS",
        "description": "Enterprise-grade Linux server operating system",
        "components": [
            ("linux-kernel", "5.15.0", "Linux Foundation", "GPL-2.0"),
            ("systemd", "249.11", "systemd Project", "LGPL-2.1"),
            ("glibc", "2.35", "GNU Project", "LGPL-2.1"),
            ("openssl", "3.0.2", "OpenSSL Foundation", "Apache-2.0"),
            ("python3", "3.10.12", "Python Software Foundation", "PSF-2.0"),
            ("openssh", "8.9", "OpenBSD Project", "BSD-2-Clause"),
            ("curl", "7.81.0", "Daniel Stenberg", "curl"),
            ("grub2", "2.06", "GNU Project", "GPL-3.0"),
        ],
    },
    {
        "name": "Cisco IOS Router",
        "item_type": "device",
        "category": "Network Device",
        "manufacturer": "Cisco Systems",
        "developer": "Cisco Systems",
        "version": "15.9.3M6",
        "description": "Enterprise router running Cisco IOS operating system",
        "components": [
            ("cisco-ios", "15.9.3M6", "Cisco Systems", "Cisco-proprietary"),
            ("openssl", "1.0.2u", "OpenSSL Foundation", "OpenSSL"),
            ("busybox", "1.29.3", "Bruce Perens", "GPL-2.0"),
            ("linux-kernel", "4.14.304", "Linux Foundation", "GPL-2.0"),
            ("openssh", "7.4p1", "OpenBSD Project", "BSD-2-Clause"),
            ("curl", "7.82.0", "Daniel Stenberg", "curl"),
        ],
    },
    {
        "name": "Elasticsearch",
        "item_type": "application",
        "category": "Search Engine",
        "manufacturer": "Elastic NV",
        "developer": "Elastic NV",
        "version": "8.11.1",
        "description": "Distributed search and analytics engine",
        "components": [
            ("java", "21.0.1", "Oracle Corporation", "GPL-2.0"),
            ("lucene", "9.8.0", "Apache Software Foundation", "Apache-2.0"),
            ("netty", "4.1.100", "Netty Project", "Apache-2.0"),
            ("jackson", "2.15.3", "FasterXML", "Apache-2.0"),
            ("log4j2", "2.21.1", "Apache Software Foundation", "Apache-2.0"),
            ("snappy", "1.1.10.5", "Google LLC", "BSD-3-Clause"),
        ],
    },
    {
        "name": "Grafana",
        "item_type": "application",
        "category": "Observability",
        "manufacturer": "Grafana Labs",
        "developer": "Grafana Labs",
        "version": "10.2.2",
        "description": "Open source analytics and monitoring platform",
        "components": [
            ("golang", "1.21.3", "Google LLC", "BSD-3-Clause"),
            ("react", "18.2.0", "Meta Platforms Inc", "MIT"),
            ("prometheus-client", "1.17.0", "Prometheus Authors", "Apache-2.0"),
            ("sqlite", "3.43.2", "D. Richard Hipp", "blessing"),
            ("grpc", "1.59.2", "Google LLC", "Apache-2.0"),
        ],
    },
    {
        "name": "WordPress",
        "item_type": "application",
        "category": "Content Management System",
        "manufacturer": "Automattic Inc",
        "developer": "WordPress Foundation",
        "version": "6.4.1",
        "description": "World's most popular CMS",
        "components": [
            ("php", "8.2.12", "PHP Group", "PHP-3.01"),
            ("mysql", "8.2.0", "Oracle Corporation", "GPL-2.0"),
            ("jquery", "3.7.1", "OpenJS Foundation", "MIT"),
            ("sodium-compat", "1.20.0", "Paragon Initiative", "ISC"),
            ("phpmailer", "6.8.1", "Marcus Bointon", "LGPL-2.1"),
        ],
    },
    {
        "name": "Node.js",
        "item_type": "application",
        "category": "JavaScript Runtime",
        "manufacturer": "OpenJS Foundation",
        "developer": "Ryan Dahl",
        "version": "20.10.0",
        "description": "JavaScript runtime built on Chrome V8 engine",
        "components": [
            ("v8", "11.8.172", "Google LLC", "BSD-3-Clause"),
            ("libuv", "1.47.0", "libuv contributors", "MIT"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("zlib", "1.3.1", "Jean-loup Gailly", "Zlib"),
            ("npm", "10.2.4", "npm Inc", "Artistic-2.0"),
        ],
    },
    {
        "name": "MongoDB",
        "item_type": "application",
        "category": "NoSQL Database",
        "manufacturer": "MongoDB Inc",
        "developer": "MongoDB Inc",
        "version": "7.0.4",
        "description": "General purpose document database",
        "components": [
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("boost", "1.80.0", "Boost Community", "BSL-1.0"),
            ("snappy", "1.1.10", "Google LLC", "BSD-3-Clause"),
            ("zlib", "1.3.1", "Jean-loup Gailly", "Zlib"),
            ("wiredtiger", "11.2.0", "MongoDB Inc", "NOASSERTION"),
        ],
    },
    {
        "name": "TensorFlow",
        "item_type": "application",
        "category": "Machine Learning",
        "manufacturer": "Google LLC",
        "developer": "Google Brain Team",
        "version": "2.14.0",
        "description": "Open source machine learning framework",
        "components": [
            ("python", "3.11.6", "Python Software Foundation", "PSF-2.0"),
            ("numpy", "1.26.1", "NumPy Community", "BSD-3-Clause"),
            ("protobuf", "4.24.4", "Google LLC", "BSD-3-Clause"),
            ("grpc", "1.59.2", "Google LLC", "Apache-2.0"),
            ("keras", "2.14.0", "Google LLC", "Apache-2.0"),
            ("flatbuffers", "23.5.26", "Google LLC", "Apache-2.0"),
        ],
    },
    {
        "name": "pfSense",
        "item_type": "device",
        "category": "Firewall",
        "manufacturer": "Netgate",
        "developer": "Netgate",
        "version": "2.7.2",
        "description": "Open source firewall and router software distribution",
        "components": [
            ("freebsd", "14.0", "FreeBSD Foundation", "BSD-2-Clause"),
            ("openssl", "3.0.11", "OpenSSL Foundation", "Apache-2.0"),
            ("strongswan", "5.9.12", "strongSwan Project", "GPL-2.0"),
            ("openvpn", "2.6.8", "OpenVPN Inc", "GPL-2.0"),
            ("php", "8.2.12", "PHP Group", "PHP-3.01"),
            ("squid", "6.5", "Squid Project", "GPL-2.0"),
            ("snort", "3.1.64.0", "Cisco Systems", "GPL-2.0"),
            ("unbound", "1.19.0", "NLnet Labs", "BSD-3-Clause"),
        ],
    },
]


def get_or_create_component(db, name, version, supplier, license_name):
    existing = (
        db.query(models.Component)
        .filter(
            models.Component.component_name == name,
            models.Component.version == version,
        )
        .first()
    )
    if existing:
        return existing
    component = models.Component(
        component_name=name,
        version=version,
        supplier=supplier,
        license=license_name,
    )
    db.add(component)
    db.commit()
    db.refresh(component)
    return component


def seed_public_catalog(db, admin_user_id: int):
    seeded = 0
    for item_data in REAL_ITEMS:
        existing = db.query(models.Item).filter(
            models.Item.name == item_data["name"],
            models.Item.source_format == "public_catalog",
        ).first()
        if existing:
            continue

        item = models.Item(
            user_id=admin_user_id,
            name=item_data["name"],
            item_type=item_data["item_type"],
            category=item_data["category"],
            manufacturer=item_data["manufacturer"],
            developer=item_data["developer"],
            version=item_data["version"],
            source_format="public_catalog",
            description=item_data["description"],
            owner=item_data["manufacturer"],
            source_name=item_data["name"],
            is_public=True,
            is_verified=True,
            approval_status="approved",
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        for comp_name, comp_version, comp_supplier, comp_license in item_data["components"]:
            component = get_or_create_component(
                db, comp_name, comp_version, comp_supplier, comp_license
            )
            existing_link = db.query(models.ItemComponent).filter(
                models.ItemComponent.item_id == item.id,
                models.ItemComponent.component_id == component.id,
            ).first()
            if not existing_link:
                db.add(models.ItemComponent(item_id=item.id, component_id=component.id))
                db.commit()

        seeded += 1

    return seeded