# Vinde Sertao

Aplicacao web para equipes em campo registrarem fichas de visita, marcarem casas no mapa e entregarem relatorios para liderancas e administradores.

O codigo usa nomes tecnicos em ingles, porque isso facilita a manutencao com frameworks, bibliotecas e outros desenvolvedores. A interface do usuario e a documentacao ficam em portugues.

## Visao Geral

- Projetistas registram casas visitadas pelo mapa.
- Lideres acompanham os dados da sua equipe.
- Administradores gerenciam usuarios, equipes, territorios, duplicidades, auditoria e relatorios.
- Fotos das casas podem ser anexadas as fichas.
- Em producao, as fotos podem ir para Cloudinary e o banco guarda a URL da imagem.

## Arquitetura

- `backend/`: API REST em Java 21 com Quarkus.
- `frontend/`: aplicacao Angular com Leaflet e OpenStreetMap.
- `infra/`: Docker Compose, PostgreSQL/PostGIS e Nginx.

## Glossario do Codigo

| Termo no codigo | Significado no sistema |
| --- | --- |
| `HouseholdVisit` | Ficha de visita de uma casa/morador |
| `VisitRequest` | Dados enviados pelo frontend ao salvar uma ficha |
| `VisitResponse` | Dados retornados pela API sobre uma ficha |
| `Team` | Equipe ou departamento |
| `TeamType` | Tipo da equipe: evangelismo, musica, cozinha, acao social etc. |
| `AppUser` | Usuario cadastrado no sistema |
| `Role` | Perfil de acesso: admin, lider ou projetista |
| `Territory` | Territorio desenhado no mapa para uma equipe |
| `AuditLog` | Registro de auditoria: quem alterou o que e quando |
| `DuplicateVisitGroup` | Grupo de fichas possivelmente duplicadas |
| `UserTeamMembership` | Vinculo adicional de uma pessoa com outra equipe |
| `UserTeamHistory` | Historico de troca de equipe principal |

## Perfis de Acesso

- `admin`: administra todo o sistema, ve relatorios globais e gerencia cadastros.
- `lider`: acompanha dados relacionados a sua equipe.
- `projetista`: registra visitas em campo.

Usuarios tambem possuem flags operacionais:

- `canRegisterVisits`: indica se pode registrar fichas de visita.
- `canViewReports`: indica se pode visualizar relatorios.

## Equipes e Departamentos

O sistema permite cadastrar equipes de evangelismo e departamentos de apoio, como musica, cozinha, infantil, acao social, financeiro, midias, secretaria e intercessao.

Uma pessoa possui:

- uma equipe principal, que representa sua area principal;
- vinculos adicionais, usados quando uma pessoa de outro departamento tambem participa de uma equipe de evangelismo.

Exemplo:

- Maria pertence ao departamento de Musica.
- Em alguns dias, Maria evangeliza com a Equipe Azul.
- No sistema, Maria pode ter Musica como equipe principal e Equipe Azul como vinculo adicional.

## Visitas

A entidade `HouseholdVisit` representa a ficha de visita.

Ela pode conter:

- nome da pessoa;
- telefone;
- endereco;
- bairro;
- cidade;
- coordenadas no mapa;
- aceite ou nao de novas visitas;
- idade;
- quantidade de moradores;
- ponto de referencia;
- pedido de oracao;
- proxima visita;
- observacoes;
- foto anexada;
- responsavel;
- equipe;
- datas de criacao/alteracao.

## Fotos

No ambiente local, se Cloudinary nao estiver configurado, a foto pode ser salva no banco como base64 para facilitar testes.

Em producao, o caminho recomendado e Cloudinary:

- o frontend comprime a imagem antes de enviar;
- o backend envia a imagem para o Cloudinary;
- o banco salva `photoUrl` e `photoPublicId`;
- o relatorio Excel/CSV inclui a URL da foto.

Variaveis usadas:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_FOLDER=vinde-sertao/visitas
```

As credenciais ficam apenas no backend. O frontend nunca deve receber o `api_secret`.

## Dashboard e Relatorios

O Dashboard administrativo mostra:

- total de casas alcancadas;
- casas que aceitam visitas;
- casas que nao aceitam visitas;
- media diaria contra meta;
- produtividade por equipe com visitas registradas;
- relatorio individual apenas de equipes de evangelismo;
- quem cadastrou fichas;
- bairros informados;
- casas alcancadas por dia.

Observacao importante: equipes que nao sao de evangelismo, como Musica, Cozinha ou Infantil, nao devem aparecer no relatorio individual de produtividade de visitas, porque esse indicador mede casas visitadas e aceite de visita.

## Territorios

`Territory` permite desenhar poligonos no mapa e atribuir a uma equipe de evangelismo.

Cada territorio pode:

- ter uma cor;
- estar ativo/inativo;
- bloquear o registro de visita fora da area da equipe, quando a regra estiver ligada.

## Auditoria

`AuditLog` registra eventos sensiveis:

- criacao/alteracao de usuarios;
- criacao/alteracao de equipes;
- criacao/alteracao de territorios;
- criacao/alteracao de fichas;
- mesclagem de duplicidades.

A tela de auditoria traduz esses eventos para uma linguagem mais compreensivel para usuarios comuns.

## Banco de Dados

Recomendacao: PostgreSQL com PostGIS.

Motivos:

- bom suporte a dados geograficos;
- indices espaciais;
- maturidade para relatorios e consistencia;
- bom caminho para deploy em nuvem.

O controle de schema usa Flyway:

- migracoes de producao: `backend/src/main/resources/db/migration`
- migracoes de teste: `backend/src/main/resources/db/test`

## Como Rodar Localmente

Backend:

```bash
cd backend
mvn quarkus:dev
```

Frontend:

```bash
cd frontend
npm install
npm start
```

Aplicacao:

- http://localhost:4200

Swagger/OpenAPI:

- http://localhost:8080/q/swagger-ui
- http://localhost:8080/q/openapi

## Como Rodar com Docker

```bash
cd infra
docker compose up --build
```

Servicos:

- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- PostgreSQL/PostGIS: `localhost:5432`

## Usuario Inicial

- E-mail: `admin@vindesertao.local`
- Senha: `Admin123!`
- Perfil: `admin`

Em ambiente real, troque a senha no primeiro acesso.

## Variaveis Principais

Backend:

```text
QUARKUS_DATASOURCE_JDBC_URL
QUARKUS_DATASOURCE_USERNAME
QUARKUS_DATASOURCE_PASSWORD
JWT_ISSUER
JWT_PRIVATE_KEY_LOCATION
JWT_PUBLIC_KEY_LOCATION
APP_CORS_ORIGINS
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_FOLDER
```

Frontend:

```text
API_BASE_URL
```

## Validacao

Backend:

```bash
cd backend
mvn clean test
```

Frontend:

```bash
cd frontend
npm run build
```

## Observacoes Para Desenvolvedores

- Nomes de classes/metodos permanecem em ingles por padrao tecnico.
- Textos de tela e documentacao devem permanecer em portugues.
- Evite salvar arquivos no disco local do servidor em producao, especialmente no Render Free.
- Para fotos em producao, prefira Cloudinary ou outro storage externo.
- Ao adicionar campos no banco, crie migracao Flyway para producao e teste.
