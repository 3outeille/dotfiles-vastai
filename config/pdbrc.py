import pdb

class Config(pdb.DefaultConfig):

    editor = 'vim'
    stdin_paste = 'epaste'
    filename_color = pdb.Color.red
    use_terminal256formatter = False
    sticky_by_default = False

    def __init__(self):
        # import readline
        # readline.parse_and_bind('set convert-meta on')
        # readline.parse_and_bind('Meta-/: complete')

        try:
            from pygments.formatters import terminal
        except ImportError:
            pass
        else:
            self.colorscheme = terminal.TERMINAL_COLORS.copy()
            self.colorscheme.update({
                terminal.Comment: ('darkgray', 'black'),
                terminal.Keyword: ('brightred', 'red'),
                terminal.Name.Builtin: ('brightred', 'magenta'),
                terminal.Name.Function: ('brightblue', 'blue'),
                terminal.Name.Class: ('cyan', 'cyan'),
                terminal.Name.Exception: ('darkblue', 'blue'),
                terminal.Name.Variable: ('white', 'white'),
                terminal.Name.Constant: ('yellow', 'yellow'),
                terminal.Number: ('darkyellow', 'yellow'),
                terminal.String: ('green', 'green'),
                })
