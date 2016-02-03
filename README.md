# babel-plugin-object-initializer-dragons-included
This is a [Babel](https://babeljs.io) plugin which allows constructing objects and immediately assigning/defining properties and methods, using something resembling the object literal syntax.

**Caveat** : This package uses **private APIs** and **hacks** to register a syntax extension into Babylon (Babel's parser) and therefore may be broken by **any** Babel update. Here be dragons !
```
.                                                /===-_---~~~~~~~~~------____
                                                |===-~___                _,-'
                 -==\\                         `//~\\   ~~~~`---.___.-~~
             ______-==|                         | |  \\           _-~`
       __--~~~  ,-/-==\\                        | |   `\        ,'
    _-~       /'    |  \\                      / /      \      /
  .'        /       |   \\                   /' /        \   /'
 /  ____  /         |    \`\.__/-~~ ~ \ _ _/'  /          \/'
/-'~    ~~~~~---__  |     ~-/~         ( )   /'        _--~`
                  \_|      /        _)   ;  ),   __--~~
                    '~~--_/      _-~/-  / \   '-~ \
                   {\__--_/}    / \\_>- )<__\      \
                   /'   (_/  _-~  | |__>--<__|      |
                  |0  0 _/) )-~     | |__>--<__|     |
                  / /~ ,_/       / /__>---<__/      |
                 o o _//        /-~_>---<__-~      /
                 (^(~          /~_>---<__-      _-~
                ,/|           /__>--<__/     _-~
             ,//('(          |__>--<__|     /                  .----_
            ( ( '))          |__>--<__|    |                 /' _---_~\
         `-)) )) (           |__>--<__|    |               /'  /     ~\`\
        ,/,'//( (             \__>--<__\    \            /'  //        ||
      ,( ( ((, ))              ~-__>--<_~-_  ~--____---~' _/'/        /'
    `~/  )` ) ,/|                 ~-_~>--<_/-__       __-~ _/
  ._-~//( )/ )) `                    ~~-'_/_/ /~~~~~~~__--~
   ;'( ')/ ,)(                              ~~~~~~~~~~
  ' ') '( (/
    '   '  `
```

## Usage
To install this package, run :
```sh
npm install --save-dev babel-plugin-object-initializer-dragons-included
```
Then, to enable it, add `object-initializer-dragons-included` to the `plugins` array of your `.babelrc` file.

## Examples (a bit contrived ...)
Assigning some properties to an object :
```js
class User {
    constructor(username, email) {
        this.username = username;
        this.email = email;
        this.firstName = null;
        this.lastName = null;
        // ... potentially a lot of other attributes with defaults ...
        this.phone = null;
        this.birthday = null;
    }
    async save() {
        // ... some calls to a persistence layer ...
    }
}

function createDemoUser() {
    return new User('Exter-N', 'exter-n@exter-n.fr') {
        firstName: 'Nicolas',
        birthday: new Date(1991, 10, 29)
    };
}

function createDemoUserNoOI() {
    let user = new User('Exter-N', 'exter-n@exter-n.fr');
    user.firstName = 'Nicolas';
    user.birthday = new Date(1991, 10, 29);
    return user;
}
```
Overriding a method just for one instance :
```js
class ListFactory {
    createList() {
        return document.createElement('ul');
    }
}

let blueListFactory = new ListFactory {
    createList() {
        let list = super.createList();
        list.style.color = 'blue';
        return list;
    }
};

let blueListFactoryNoOI = new ListFactory;
blueListFactoryNoOI.createList = function createList() {
    let list = ListFactory.prototype.createList.call(this);
    list.style.color = 'blue';
    return list;
};
```

## Property/method shadowing
In most cases, using the object initializer syntax is equivalent to assigning the properties "the classic way", as shown above (except that you can use `super` in overridden methods). It will therefore invoke the properties' setters where appropriate. But there are cases where you may want to define a new property which will shadow the one defined in the class. There are two ways to do that in the initializer.

### Automatic shadowing of `get`/`set` properties
If you declare a `get`/`set` property, it will automatically shadow any existing one :
```js
class Greeter {
    constructor(recipient) {
        this.recipient = recipient;
    }
    get message() {
        return 'Hello, ' + this.recipient + '!';
    }
    greet() {
        console.log(this.message);
    }
}

// This will print "Bonjour, monde !" ("Hello, world!" in French)
// Again, quite the contrived example ...
(new Greeter('world') {
    get message() {
        return 'Bonjour, ' + this.recipient + ' !';
    },
    recipient: 'monde'
}).greet();
```

### Explicit shadowing
You can apply the `@shadow` ambient decorator to a property or method to explicitly shadow the existing one, for example to force-set a read-only property :
```js
class ProtectedObject {
    get someProperty() {
        return "some read-only, maybe computed value";
    }
}

function thisWouldThrow() {
    return new ProtectedObject {
        someProperty: "some other value"
    };
}

function thisWouldNot() {
    return new ProtectedObject {
        @shadow someProperty: "some other value"
    };
}
```

## License
This package is released by Nicolas "Exter-N" L. under the MIT License. See [LICENSE.md](./LICENSE.md).
