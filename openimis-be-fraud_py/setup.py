from setuptools import setup

# This package's own module files (apps.py, models.py, services.py, ...) sit
# flat in this directory rather than nested under a fraud/ subfolder, so
# find_packages() (which discovers packages by looking for subdirectories
# containing __init__.py) finds nothing here -- pip install "succeeds" but
# installs zero actual files, and `import fraud` fails at runtime with
# ModuleNotFoundError. package_dir tells setuptools this directory itself
# IS the fraud package.
setup(
    name='openimis-be-fraud',
    version='1.0.0',
    description='ClaimGuard AI Fraud Detection Module for openIMIS',
    packages=['fraud', 'fraud.migrations'],
    package_dir={'fraud': '.'},
    install_requires=[
        'django',
        'graphene-django',
        'requests',
    ],
    url='https://github.com/chaldeastudios/openimis-be-fraud_py',
    license='GNU AGPL v3',
)
