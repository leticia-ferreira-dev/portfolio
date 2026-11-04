DROP DATABASE IF EXISTS formadora2;
CREATE DATABASE formadora2
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE formadora2;

CREATE TABLE professor (
    id_prof INT NOT NULL,
    nome_prof VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_prof)
) ENGINE=InnoDB;

CREATE TABLE aluno (
    id_aluno INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    PRIMARY KEY (id_aluno)
) ENGINE=InnoDB;

CREATE TABLE curso (
    id_curso INT NOT NULL,
    nome_curso VARCHAR(100) NOT NULL,
    carga_hora INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    id_prof INT NOT NULL,
    PRIMARY KEY (id_curso),
    FOREIGN KEY (id_prof) REFERENCES professor(id_prof)
) ENGINE=InnoDB;

CREATE TABLE matricular (
    id_aluno INT NOT NULL,
    id_curso INT NOT NULL,
    PRIMARY KEY (id_aluno, id_curso),
    FOREIGN KEY (id_aluno) REFERENCES aluno(id_aluno),
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso)
) ENGINE=InnoDB;

INSERT INTO professor (id_prof, nome_prof, especialidade) VALUES
(1, 'João Silva', 'Programação'),
(2, 'Maria Nunes', 'Banco de Dados'),
(3, 'Joana Fagundes', 'Lógica'),
(4, 'Paulo Nunes', 'Biologia');

INSERT INTO curso (id_curso, nome_curso, carga_hora, descricao, id_prof) VALUES
(100, 'Programação OO', 60, 'Curso de Programação Orientada a Objetos', 1),
(101, 'Programação Estruturada', 40, 'Curso de Programação Estruturada', 1),
(102, 'BD Relacional', 80, 'Curso de Banco de Dados Relacional', 2),
(103, 'BD NoSQL', 30, 'Curso de Banco de Dados Not Only SQL', 2),
(104, 'Lógica de Programação', 60, 'Curso de Lógica de Programação', 3),
(105, 'Estrutura de Dados', 80, 'Curso de Estrutura de Dados', 3);

INSERT INTO aluno (id_aluno, nome, email) VALUES
(1000, 'Ana Souza', 'ana.souza@exemplo.com'),
(1001, 'Marcos Alves', 'marcos.alves@exemplo.com'),
(1002, 'Patricia Rangel', 'patricia.rangel@exemplo.com'),
(1003, 'Geraldo Nascimento', 'geraldo.nascimento@exemplo.com'),
(1004, 'Nanci Neves', 'nanci.neves@exemplo.com');

INSERT INTO matricular (id_aluno, id_curso) VALUES
(1000, 100),
(1000, 101),
(1000, 102),
(1001, 101),
(1001, 102),
(1002, 103),
(1002, 104),
(1003, 104),
(1004, 101);

SELECT * FROM curso;

SELECT a.id_aluno, a.nome, a.email
FROM aluno a
INNER JOIN matricular m ON m.id_aluno = a.id_aluno
INNER JOIN curso c ON c.id_curso = m.id_curso
WHERE c.nome_curso = 'Programação Estruturada';

UPDATE professor
SET especialidade = 'Programação Fullstack'
WHERE id_prof = 1;

DELETE FROM curso
WHERE id_curso = 105;
