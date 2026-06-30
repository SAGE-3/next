pipeline {
    agent any

    environment {
        STAGING_HOST = '192.168.1.33'
        PROD_HOST    = '192.168.1.36'
        DEPLOY_USER  = 'root'
        APP_DIR      = '/opt/sage3'
        SAMBA_AD_IP  = '192.168.1.34'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Tests LDAP local') {
            steps {
                sh '''
                    cd deployment/test-ldap
                    docker compose up -d
                    sleep 10
                    ldapwhoami -H ldap://127.0.0.1:3890 \
                        -D "cn=admin,dc=example,dc=com" -w admin \
                        && echo "LDAP local OK" || echo "LDAP local KO (non bloquant)"
                    docker compose down
                '''
            }
        }

        stage('Tests AD Samba') {
            steps {
                sh """
                    ldapwhoami -H ldap://${SAMBA_AD_IP} \
                        -D "CN=Administrator,CN=Users,DC=test,DC=local" \
                        -w Admin2026Test! \
                        && echo "Samba AD OK" || echo "Samba AD KO (non bloquant)"
                """
            }
        }

        stage('Build Docker images') {
            steps {
                sh 'docker compose -f deployment/docker-compose-amd64.yml build'
            }
        }

        stage('Deploy Staging') {
            when {
                anyOf {
                    branch 'staging'
                    branch 'staging/*'
                    branch 'feature/*'
                }
            }
            steps {
                sshagent(credentials: ['jenkins-deploy-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${STAGING_HOST} '
                            mkdir -p ${APP_DIR} &&
                            if [ -d ${APP_DIR}/.git ]; then
                                cd ${APP_DIR} && git pull
                            else
                                git clone http://192.168.1.30:3000/gitea-admin/next.git ${APP_DIR}
                            fi &&
                            cp deployment/configurations/.env.staging .env 2>/dev/null || true &&
                            docker compose -f deployment/docker-compose-amd64.yml up -d --build
                        '
                    """
                }
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            input {
                message 'Déployer SAGE3 en production ?'
                ok 'Déployer'
            }
            steps {
                sshagent(credentials: ['jenkins-deploy-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${PROD_HOST} '
                            mkdir -p ${APP_DIR} &&
                            if [ -d ${APP_DIR}/.git ]; then
                                cd ${APP_DIR} && git pull
                            else
                                git clone http://192.168.1.30:3000/gitea-admin/next.git ${APP_DIR}
                            fi &&
                            cp deployment/configurations/.env.prod .env 2>/dev/null || true &&
                            docker compose -f deployment/docker-compose-amd64.yml up -d --build
                        '
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline SAGE3 OK — branche ${env.BRANCH_NAME}"
        }
        failure {
            echo "Pipeline SAGE3 ECHEC — branche ${env.BRANCH_NAME}"
        }
    }
}
