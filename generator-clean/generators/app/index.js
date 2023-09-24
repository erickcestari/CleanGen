const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

const toUpperCase = (name) => {
  return name[0].toUpperCase() + name.substring(1);
}

const toLowerCase = (name) => {
  return name[0].toLowerCase() + name.substring(1);
}

const editFile = async (path, whereToReplace, newContent, replaceAfter = null) => {
  let data;

  try {
    data = await fs.promises.readFile(path, 'utf8');
  } catch (err) {
    console.error(`\nErro ao encontrar o arquivo ${path}! 😭`);
    return;
  }

  const dataReplaced = data.replace(whereToReplace, replaceAfter ? whereToReplace + newContent : newContent + whereToReplace);

  try {
    await fs.promises.writeFile(path, dataReplaced, 'utf8');
    console.log(`\n${path} atualizado com sucesso! 🧐`);
  } catch (err) {
    console.error(err);
  }

  return dataReplaced;
}

module.exports = class extends Generator {

  async prompting() {
    this.log('\n Olá, bem-vindo(a) ao gerador de Clean Express 💻 \n Pegue suas antoções e vamos lá! 📝 \n')

    const entity = await this.prompt(
      {
        type: 'input',
        name: 'entity',
        message: 'Informe o nome da entidade que você deseja criar?',
        default: 'estudante'
      }
    );

    this.entity = toLowerCase(entity.entity);
    this.entityUp = toUpperCase(this.entity);

    const askEntityPlural = await this.prompt(
      {
        type: 'confirm',
        name: 'askEntityPlural',
        message: `A forma plural de ${this.entity} é ${this.entity}s?`,
      }
    );

    if (askEntityPlural.askEntityPlural) {
      this.entityPlural = `${this.entity}s`
    } else {
      const entityPlural = await this.prompt(
        {
          type: 'input',
          name: 'entityPlural',
          message: `Escreva a forma plural de ${this.entity}?`,
        }
      );

      this.entityPlural = toLowerCase(entityPlural.entityPlural)
    }
    this.entityUpPlural = toUpperCase(this.entityPlural);

    const isEntityMale = await this.prompt({
      type: 'confirm',
      name: 'isEntityMale',
      message: `${this.entity} é uma palavra masculina?`
    });

    this.isEntityMale = isEntityMale.isEntityMale
    this.genderChar = this.isEntityMale ? "o" : "a"

    this.log('\nModel Prisma 🤖\n')

    let modelProperties = []
    const typeModelChoices = ['String', 'Enum', 'Boolean', 'Int', 'Decimal', 'Float', 'DateTime @default(now())', 'DateTime']

    this.log("Pode deixar que eu crio o Id e o SoftDelete para você! 😁")

    while (true) {
      const propertyName = await this.prompt({
        type: 'input',
        name: 'propertyName',
        message: `Informe o nome da ${modelProperties.length + 1}ª propriedade de ${this.entityUp}Model.`,
        default: `Nome`,
      })

      const propertyType = await this.prompt({
        type: 'rawlist',
        name: 'propertyType',
        message: `Informe o tipo para a ${modelProperties.length + 1}ª propriedade.`,
        choices: typeModelChoices
      })

      const isEnum = propertyType.propertyType === 'Enum'
      let defaultValueContent

      if (!isEnum) {
        let isRequired = true
        if (!propertyType.propertyType.includes('@default')) {
          const askIsRequired = await this.prompt({
            type: 'confirm',
            name: 'askIsRequired',
            message: `Propriedade ${propertyName.propertyName} de ${this.entityUp}Model é obrigatória?`,
          })
          isRequired = askIsRequired.askIsRequired

          if (!isRequired) {
            const hasDefaultValue = await this.prompt({
              type: 'confirm',
              name: 'hasDefaultValue',
              message: `Propriedade ${propertyName.propertyName} de ${this.entityUp}Model possue default value (valor padrão)?`,
            })

            if (hasDefaultValue.hasDefaultValue) {
              const defaultValue = await this.prompt({
                type: 'input',
                name: 'defaultValue',
                message: `Informe o default value (valor padrão) para a propriedade ${propertyName.propertyName} de ${this.entityUp}. @default(${propertyType.propertyType === "String" ? '"value"' : "value"}) | value:`,
              })
              defaultValueContent = `@default(${propertyType.propertyType === "String" ? '"' + defaultValue.defaultValue + '"' : defaultValue.defaultValue})`
            }
          }
        }

        modelProperties.push({
          name: propertyName.propertyName,
          type: propertyType.propertyType,
          isOptional: !isRequired,
          defaultValueContent: defaultValueContent,
          isNumber: propertyType.propertyType === 'Int' || propertyType.propertyType === 'Decimal' || propertyType.propertyType === 'Float'
        })
      }
      else {
        const enumValues = await this.prompt({
          type: 'input',
          name: 'enumValues',
          message: `Informe os valores do enum separados por vírgula.`,
        })

        const hasDefaultValue = await this.prompt({
          type: 'confirm',
          name: 'hasDefaultValue',
          message: `Propriedade ${propertyName.propertyName} de ${this.entityUp}Model possue default value (valor padrão)?`,
        })

        if (hasDefaultValue.hasDefaultValue) {
          const defaultValue = await this.prompt({
            type: 'input',
            name: 'defaultValue',
            message: `Informe o default value (valor padrão) para a propriedade ${propertyName.propertyName} de ${this.entityUp}. @default(value) | value:`,
          })
          defaultValueContent = `@default(${defaultValue.defaultValue})`
        }

        const enumValuesArray = enumValues.enumValues.split(",").map(value => value.trim())
        const enumValuesString = enumValuesArray.reduce((previous, current) => {
          return previous + `\n  ${current}`
        }, "")

        const enumName = `${toUpperCase(propertyName.propertyName)}`
        const enumContent = `enum ${enumName} {
          ${enumValuesString}
        }`

        modelProperties.push({
          name: propertyName.propertyName,
          type: propertyType.propertyType,
          defaultValueContent: defaultValueContent,
          isOptional: false,
          enumContent: enumContent,
          isNumber: false
        })
      }
      const askMoreProperties = await this.prompt({
        type: 'confirm',
        name: 'askMoreProperties',
        message: `Deseja adicionar mais uma propriedade para ${this.entityUp}Model?`
      })

      if (!askMoreProperties.askMoreProperties) {
        break;
      } else {
        this.log('\n')
      }
    }
    this.modelProperties = modelProperties;
    this.foreignKeyProperties = []


    this.log('\nRelationship Prisma 💏\n')

    const askRelationship = await this.prompt({
      type: 'confirm',
      name: 'askRelationship',
      message: `Você deseja responder a perguntas para criar os relacionamentos de ${this.entity}?`
    })

    this.askRelationship = askRelationship.askRelationship

    if (this.askRelationship) {
      const relationshipProperties = []
      const relationshipTypeChoices = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany']

      while (true) {

        const relationshipName = await this.prompt({
          type: 'input',
          name: 'relationshipName',
          message: `Informe o nome do model da entidade que se relacionara com ${this.entityUp}.`,
          default: `Mensagens`,
        })

        const relationshipType = await this.prompt({
          type: 'rawlist',
          name: 'relationshipType',
          message: `Informe o tipo do relacionamento. Sabendo que:\n ManyToMany (Um ${entity.entity} tem muitos ${relationshipName.relationshipName} e um ${relationshipName.relationshipName} tem muitos ${entity.entity})
        \n OneToMany (Um ${entity.entity} tem muitos ${relationshipName.relationshipName} e um ${relationshipName.relationshipName} tem um ${entity.entity})
        \n ManyToOne (Um ${entity.entity} tem um ${relationshipName.relationshipName} e um ${relationshipName.relationshipName} tem muitos ${entity.entity})
        \n OneToOne (Um ${entity.entity} tem um ${relationshipName.relationshipName} e um ${relationshipName.relationshipName} tem um ${entity.entity}) ou vice-versa`,
          choices: relationshipTypeChoices
        })


        if (relationshipType.relationshipType === 'OneToOne') {
          const entityHasForeignKey = await this.prompt({
            type: 'confirm',
            name: 'entityHasForeignKey',
            message: `A entidade ${this.entityUp} terá a chave estrangeira de ${relationshipName.relationshipName}?`,
          })
          relationshipProperties.push({
            name: relationshipName.relationshipName,
            type: relationshipType.relationshipType,
            hasForeignKey: !entityHasForeignKey.entityHasForeignKey,
            entityHasForeignKey: entityHasForeignKey.entityHasForeignKey,
          })
        } else {
          relationshipProperties.push({
            name: relationshipName.relationshipName,
            type: relationshipType.relationshipType,
          })
        }

        const askMoreRelationships = await this.prompt({
          type: 'confirm',
          name: 'askMoreRelationships',
          message: `Deseja adicionar mais um relacionamento para ${this.entityUp}?`
        })

        if (!askMoreRelationships.askMoreRelationships) {
          break;
        } else {
          this.log('\n')
        }
      }

      this.relationshipProperties = relationshipProperties
    }
  }

  async writing() {
    this.log('\nCriando arquivos... 📁\n')

    if (this.modelProperties) {

      let modelProperties = this.modelProperties.reduce((previous, current) => {
        if (current.enumContent) {
          return previous + `\n  ${current.name} ${toUpperCase(current.name)}${current.isOptional ? "?" : ""} ${current.defaultValueContent ? current.defaultValueContent : ""}`
        }
        return previous + `\n  ${current.name} ${current.type}${current.isOptional ? "?" : ""} ${current.defaultValueContent ? current.defaultValueContent : ""}`
      }, '\nid String @id @default(uuid())')

      modelProperties += '\ndeletedAt DateTime?\nisDeleted Boolean @default(false)'

      let relationshipPropertiesText = ''
      let foreignRelationshipProperties = ''

      if (this.askRelationship) {
        relationshipPropertiesText = this.relationshipProperties.reduce((previous, current) => {
          switch (current.type) {
            case 'OneToOne':
              if (current.entityHasForeignKey) {
                return previous + `\n  ${toLowerCase(current.name)} ${toUpperCase(current.name)} @relation(fields: [${toLowerCase(current.name)}Id], references: [id])\n ${toLowerCase(current.name)}Id String @unique`
              } else {
                return previous + `\n  ${toLowerCase(current.name)} ${toUpperCase(current.name)}?`
              }
            case 'OneToMany':
              return previous + `\n  ${toLowerCase(current.name)} ${toUpperCase(current.name)}[]`
            case 'ManyToOne':
              return previous + `\n  ${toLowerCase(current.name)} ${toUpperCase(current.name)} @relation(fields: [${toLowerCase(current.name)}Id], references: [id])\n ${toLowerCase(current.name)}Id String`
            case 'ManyToMany':
              return previous + `\n  ${toLowerCase(current.name)} ${toUpperCase(current.name)}[]`
          }
        }, '')

        foreignRelationshipProperties = this.relationshipProperties.map((current) => {
          switch (current.type) {
            case 'OneToOne':
              let content;
              if (!current.entityHasForeignKey) {
                content = `\n  ${toLowerCase(this.entityPlural)} ${toUpperCase(this.entityPlural)} @relation(fields: [${toLowerCase(this.entityPlural)}Id], references: [id])\n ${toLowerCase(this.entityPlural)}Id String @unique`
              } else {
                content = `\n  ${toLowerCase(this.entityPlural)} ${toUpperCase(this.entityPlural)}?`
              }

              return {
                name: current.name,
                content: content,
                hasForeignKey: current.hasForeignKey,
                entityHasForeignKey: current.entityHasForeignKey,
                entityHasMany: false,
                hasMany: false
              }
            case 'OneToMany':
              return {
                name: current.name,
                content: `\n  ${toLowerCase(this.entityPlural)} ${toUpperCase(this.entityPlural)} @relation(fields: [${toLowerCase(this.entityPlural)}Id], references: [id])\n ${toLowerCase(this.entityPlural)}Id String`,
                hasForeignKey: true,
                entityHasForeignKey: false,
                entityHasMany: true,
                hasMany: false
              }
            case 'ManyToOne':
              return {
                name: current.name, content: `\n  ${toLowerCase(this.entityPlural)} ${toUpperCase(this.entityPlural)}[]`,
                hasForeignKey: false,
                entityHasForeignKey: true,
                entityHasMany: false,
                hasMany: true
              }
            case 'ManyToMany':
              return {
                name: current.name, content: `\n  ${toLowerCase(this.entityPlural)} ${toUpperCase(this.entityPlural)}[]`,
                hasForeignKey: false,
                entityHasForeignKey: false,
                entityHasMany: true,
                hasMany: true,
              }
          }
        })
        this.foreignRelationshipProperties = foreignRelationshipProperties
      }

      const reduceEnum = this.modelProperties.reduce((previous, current) => {
        if (current.enumContent) {
          return previous + '\n' + current.enumContent
        }
        return previous
      }, '')

      const path = 'src/Prisma/schema.prisma'
      const newContent = `model ${this.entityUpPlural} {
        ${modelProperties}
        ${relationshipPropertiesText}
}\n`

      const whereToReplace = '// generate-here'
      await editFile(path, whereToReplace, newContent)

      if (!!reduceEnum) {
        const whereToReplaceEnum = `model ${this.entityUp}`
        await editFile(path, whereToReplaceEnum, reduceEnum + '\n\n')
      }

      if (this.askRelationship) {
        for (const relationship of this.foreignRelationshipProperties) {
          const whereToReplaceRelationship = `model ${toUpperCase(relationship.name)} {`
          await editFile(path, whereToReplaceRelationship, '\n\n' + relationship.content, true)
        }
      }
    }

    // edit relationship files 

    if (this.askRelationship) {
      for (const relationship of this.foreignRelationshipProperties) {
        const relationshipRepositoryPath = `src/Repository/${toLowerCase(relationship.name)}Repository.ts`

        const whereToReplaceRelationshipGet = `// get Relational fields`
        await editFile(relationshipRepositoryPath, whereToReplaceRelationshipGet, '\n' + `${this.entityPlural}: true,`, true)

        const whereToReplaceRelationshipGetOne = `// getOne Relational fields`

        await editFile(relationshipRepositoryPath, whereToReplaceRelationshipGetOne, '\n' + `${this.entityPlural}: true,`, true)
      }
    }

    const obj = {
      entity: this.entity,
      entityUp: this.entityUp,
      genderChar: this.genderChar,
      entityPlural: this.entityPlural,
      entityUpPlural: this.entityUpPlural,
      modelProperties: this.modelProperties,
      relationshipProperties: this.foreignRelationshipProperties,
    }

    this.fs.copyTpl(
      this.templatePath(`src/Infra/Repository/repository.ts`),
      this.destinationPath(path.join(`src/Infra/Repository/`, `${this.entityPlural}Repository.ts`)), obj
    )

    this.fs.copyTpl(
      this.templatePath(`src/Domain/Service/service.ts`),
      this.destinationPath(path.join(`src/Domain/Service/`, `${this.entityPlural}Service.ts`)), obj
    )


    this.fs.copyTpl(
      this.templatePath(`src/Application/Controller/controller.ts`),
      this.destinationPath(path.join(`src/Application/Controller/`, `${this.entityPlural}Controller.ts`)), obj
    )


    this.fs.copyTpl(
      this.templatePath(`src/Api/Validator/validator.ts`),
      this.destinationPath(path.join(`src/Api/Validator/`, `${this.entityPlural}Validator.ts`)), obj
    )


    this.fs.copyTpl(
      this.templatePath(`src/Api/middlewares/middleware.ts`),
      this.destinationPath(path.join(`src/Api/middlewares/`, `${this.entityPlural}Middleware.ts`)), obj
    )


    this.fs.copyTpl(
      this.templatePath(`src/Api/Routes/routes.ts`),
      this.destinationPath(path.join(`src/Api/Routes`, `${this.entityPlural}Routes.ts`)), obj
    )

    const pathRoute = 'src/Api/Routes/routes.ts'
    let whereToReplace = 'import'
    let newContent = `\nimport ${this.entityPlural}Routes from './${this.entityPlural}Routes'\n`
    await editFile(pathRoute, whereToReplace, newContent)
    whereToReplace = '// Rotas não existentes'
    newContent = `\n routes.use('/${this.entityPlural}', ${this.entityPlural}Routes)\n`
    await editFile(pathRoute, whereToReplace, newContent)

    if (this.askRelationship) {
      for (const relationship of this.foreignRelationshipProperties) {
        if (relationship.hasForeignKey) {
          const pathRoute = `src/Api/validator/${relationship.name}Validator.ts`
          let whereToReplace = 'id: Joi.string().guid().required()'
          let newContent = `\n${toLowerCase(this.entityPlural)}Id: Joi.string().guid(),\n`
          await editFile(pathRoute, whereToReplace, newContent)

          whereToReplace = 'local: Joi.allow(),'
          newContent = `\n${toLowerCase(this.entityPlural)}Id: Joi.string().guid().required(),\n`
          await editFile(pathRoute, whereToReplace, newContent)

          const pathTest = `src/Api/tests/${relationship.name}Routes.spec.ts`
          const regexPattern = `// foreing key`;
          const regex = new RegExp(regexPattern, "g");
          newContent = `\nconst ${toLowerCase(this.entityPlural)} = await prisma.${this.entityPlural}.create({
            data: {
            ${this.modelProperties.reduce((previous, current) => {
            if (current.isNumber) {
              return previous + `\n  ${current.name}: 1,`
            }
            return previous + `\n  ${current.name}: 'Teste',`
          }, '')}
            },
          })\n`
          const fileTest = await fs.promises.readFile(pathTest, 'utf8')
          const fileTestReplaced = fileTest.replace(regex, regexPattern + '\n'  + newContent)
          await fs.promises.writeFile(pathTest, fileTestReplaced, 'utf8')

          const file = await fs.promises.readFile(pathTest, 'utf8')
          const fileReplaced = file.replace(/\/\/ relationship/g, `// relationship\n${toLowerCase(this.entityPlural)}Id: ${toLowerCase(this.entityPlural)}.id,`)
          await fs.promises.writeFile(pathTest, fileReplaced, 'utf8')
        }
      }
    }


    this.fs.copyTpl(
      this.templatePath(`src/Api/Tests/endToEnd.spec.ts`),
      this.destinationPath(path.join(`src/Api/Tests/`, `${this.entityPlural}Routes.spec.ts`)), obj
    )

  }
  end() {
    this.log('Tudo pronto! 🎉');

    this.log('🤓 Agora utilize estes comando para atualizar o prisma e fazer o migration:\n\n yarn migrations \n\n yarn lint para arrumar todos os erros de formatações')
  }
}