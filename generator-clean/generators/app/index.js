const Generator = require('yeoman-generator');
const path = require('path');

const toUpperCase = (name) => {
  return name[0].toUpperCase() + name.substring(1);
}

module.exports = class extends Generator {
  async prompting() {
    this.entity = await this.prompt(
      {
        type: 'input',
        name: 'entity',
        message: 'Qual é o nome da entidade?',
        default: 'estudante'
      }
    )
  }

  writing() {
    const data = {
      entity: this.entity,
    }
    this.fs.copyTpl(
      this.templatePath(`src/server.ts`),
      this.destinationPath(path.join(`src`, `server.ts`)), data
    )
    
    this.fs.copyTpl(
      this.templatePath(`package.json`),
      this.destinationPath(path.join(``, `package.json`)),
    )
  }
}
