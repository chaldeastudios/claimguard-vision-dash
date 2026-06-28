from setuptools import setup, find_packages

setup(
    name='openimis-be-fraud',
    version='1.0.0',
    description='ClaimGuard AI Fraud Detection Module for openIMIS',
    packages=find_packages(),
    install_requires=[
        'django',
        'graphene-django',
        'requests',
    ],
    url='https://github.com/chaldeastudios/openimis-be-fraud_py',
    license='GNU AGPL v3',
)
